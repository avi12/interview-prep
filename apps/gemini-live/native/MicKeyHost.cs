using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text.RegularExpressions;
using System.Threading;
using Microsoft.Win32.SafeHandles;

[DataContract]
class HidReport
{
    [DataMember(Name = "device")] public string Device;
    [DataMember(Name = "usagePage")] public int UsagePage;
    [DataMember(Name = "usage")] public int Usage;
    [DataMember(Name = "report")] public string Report;
}

#pragma warning disable 0649
[DataContract]
class HostCommand
{
    [DataMember(Name = "type")] public string Type;
    [DataMember(Name = "reports")] public HidReport[] Reports;
}
#pragma warning restore 0649

[DataContract]
class HostEvent
{
    [DataMember(Name = "type")] public string Type;
    [DataMember(Name = "report", EmitDefaultValue = false)] public HidReport Report;
}

class Collection
{
    public string Path, Device;
    public int UsagePage, Usage, InputReportLength;
    public string Id { get { return Device + "/" + UsagePage + "/" + Usage; } }
}

static class MicKeyHost
{
    const int RescanMs = 2000;
    const int QuietBeforePressMs = 2000;
    const int LearnTimeoutMs = 15000;
    const string UnknownDevice = "unknown";
    static readonly Regex DeviceId = new Regex("vid_[0-9a-f]{4}&pid_[0-9a-f]{4}", RegexOptions.IgnoreCase);
    static readonly object StdoutLock = new object();
    static readonly object StateLock = new object();
    static readonly HashSet<string> OpenPaths = new HashSet<string>();
    static readonly Dictionary<string, DateTime> LastReportAt = new Dictionary<string, DateTime>();
    static readonly HashSet<string> LearningCollections = new HashSet<string>();
    static HidReport[] watchedReports = new HidReport[0];
    static bool isLearning;
    static Timer learnTimeout;

    const uint GenericRead = 0x80000000;
    const uint ShareReadWrite = 3;
    const uint OpenExisting = 3;
    const int DigcfPresentInterface = 0x12;

    [StructLayout(LayoutKind.Sequential)]
    struct DeviceInterfaceData { public int Size; public Guid ClassGuid; public int Flags; public IntPtr Reserved; }

    [StructLayout(LayoutKind.Sequential)]
    struct HidCaps
    {
        public ushort Usage, UsagePage, InputReportLength, OutputReportLength, FeatureReportLength;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 17)] public ushort[] Reserved;
        public ushort NumberLinkCollectionNodes, NumberInputButtonCaps, NumberInputValueCaps, NumberInputDataIndices,
            NumberOutputButtonCaps, NumberOutputValueCaps, NumberOutputDataIndices,
            NumberFeatureButtonCaps, NumberFeatureValueCaps, NumberFeatureDataIndices;
    }

    [DllImport("hid.dll")] static extern void HidD_GetHidGuid(out Guid guid);
    [DllImport("hid.dll")] static extern bool HidD_GetPreparsedData(SafeFileHandle handle, out IntPtr data);
    [DllImport("hid.dll")] static extern bool HidD_FreePreparsedData(IntPtr data);
    [DllImport("hid.dll")] static extern int HidP_GetCaps(IntPtr data, ref HidCaps caps);
    [DllImport("setupapi.dll", CharSet = CharSet.Auto)] static extern IntPtr SetupDiGetClassDevs(ref Guid guid, IntPtr enumerator, IntPtr parent, int flags);
    [DllImport("setupapi.dll")] static extern bool SetupDiEnumDeviceInterfaces(IntPtr set, IntPtr info, ref Guid guid, int index, ref DeviceInterfaceData data);
    [DllImport("setupapi.dll", CharSet = CharSet.Auto)] static extern bool SetupDiGetDeviceInterfaceDetail(IntPtr set, ref DeviceInterfaceData data, IntPtr detail, int size, out int required, IntPtr info);
    [DllImport("setupapi.dll")] static extern bool SetupDiDestroyDeviceInfoList(IntPtr set);
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)] static extern SafeFileHandle CreateFile(string name, uint access, uint share, IntPtr security, uint disposition, uint flags, IntPtr template);

    static void Main()
    {
        new Thread(ReadCommands) { IsBackground = true }.Start();
        Send(new HostEvent { Type = "ready" });
        while (true)
        {
            OpenNewCollections();
            Thread.Sleep(RescanMs);
        }
    }

    static void ReadCommands()
    {
        var stdin = Console.OpenStandardInput();
        var serializer = new DataContractJsonSerializer(typeof(HostCommand));
        try
        {
            while (true)
            {
                var length = ReadExactly(stdin, 4);
                if (length == null) break;
                var body = ReadExactly(stdin, BitConverter.ToInt32(length, 0));
                if (body == null) break;
                Handle((HostCommand)serializer.ReadObject(new MemoryStream(body)));
            }
        }
        catch (IOException) { }
        catch (SerializationException) { }
        Environment.Exit(0);
    }

    static byte[] ReadExactly(Stream stream, int count)
    {
        var buffer = new byte[count];
        var offset = 0;
        while (offset < count)
        {
            var read = stream.Read(buffer, offset, count - offset);
            if (read == 0) return null;
            offset += read;
        }
        return buffer;
    }

    static void Handle(HostCommand command)
    {
        lock (StateLock)
        {
            if (command.Type == "watch") watchedReports = command.Reports ?? new HidReport[0];
            if (command.Type == "learn") StartLearning();
            if (command.Type == "stopLearning") StopLearning();
        }
    }

    static void StartLearning()
    {
        isLearning = true;
        LearningCollections.Clear();
        if (learnTimeout != null) learnTimeout.Dispose();
        learnTimeout = new Timer(_ => TimeOutLearning(), null, LearnTimeoutMs, Timeout.Infinite);
    }

    static void StopLearning()
    {
        isLearning = false;
        if (learnTimeout != null) learnTimeout.Dispose();
        learnTimeout = null;
    }

    static void TimeOutLearning()
    {
        lock (StateLock) StopLearning();
    }

    static void OnReport(Collection collection, byte[] bytes)
    {
        var report = new HidReport
        {
            Device = collection.Device,
            UsagePage = collection.UsagePage,
            Usage = collection.Usage,
            Report = BitConverter.ToString(bytes)
        };
        lock (StateLock)
        {
            var isQuietBefore = IsQuietBefore(collection.Id);
            if (!(isLearning ? IsLearnable(collection.Id, isQuietBefore) : watchedReports.Any(watched => IsSameReport(watched, report)))) return;
        }
        Send(new HostEvent { Type = "report", Report = report });
    }

    static bool IsQuietBefore(string collectionId)
    {
        var now = DateTime.UtcNow;
        DateTime previous;
        var isQuiet = !LastReportAt.TryGetValue(collectionId, out previous) || (now - previous).TotalMilliseconds >= QuietBeforePressMs;
        LastReportAt[collectionId] = now;
        return isQuiet;
    }

    static bool IsLearnable(string collectionId, bool isQuietBefore)
    {
        if (LearningCollections.Contains(collectionId)) return true;
        if (!isQuietBefore) return false;
        LearningCollections.Add(collectionId);
        return true;
    }

    static bool IsSameReport(HidReport left, HidReport right)
    {
        return string.Equals(left.Device, right.Device, StringComparison.OrdinalIgnoreCase)
            && left.UsagePage == right.UsagePage
            && left.Usage == right.Usage
            && string.Equals(left.Report, right.Report, StringComparison.OrdinalIgnoreCase);
    }

    static IEnumerable<string> HidPaths()
    {
        Guid guid;
        HidD_GetHidGuid(out guid);
        var set = SetupDiGetClassDevs(ref guid, IntPtr.Zero, IntPtr.Zero, DigcfPresentInterface);
        try
        {
            for (var index = 0; ; index++)
            {
                var data = new DeviceInterfaceData { Size = Marshal.SizeOf(typeof(DeviceInterfaceData)) };
                if (!SetupDiEnumDeviceInterfaces(set, IntPtr.Zero, ref guid, index, ref data)) yield break;
                int required;
                SetupDiGetDeviceInterfaceDetail(set, ref data, IntPtr.Zero, 0, out required, IntPtr.Zero);
                var detail = Marshal.AllocHGlobal(required);
                try
                {
                    Marshal.WriteInt32(detail, IntPtr.Size == 8 ? 8 : 6);
                    if (SetupDiGetDeviceInterfaceDetail(set, ref data, detail, required, out required, IntPtr.Zero))
                        yield return Marshal.PtrToStringAuto(detail + 4);
                }
                finally { Marshal.FreeHGlobal(detail); }
            }
        }
        finally { SetupDiDestroyDeviceInfoList(set); }
    }

    static Collection CollectionOf(string path)
    {
        using (var handle = CreateFile(path, 0, ShareReadWrite, IntPtr.Zero, OpenExisting, 0, IntPtr.Zero))
        {
            IntPtr data;
            if (handle.IsInvalid || !HidD_GetPreparsedData(handle, out data)) return null;
            var caps = new HidCaps();
            HidP_GetCaps(data, ref caps);
            HidD_FreePreparsedData(data);
            var device = DeviceId.Match(path);
            return new Collection
            {
                Path = path,
                Device = device.Success ? device.Value.ToLowerInvariant() : UnknownDevice,
                UsagePage = caps.UsagePage,
                Usage = caps.Usage,
                InputReportLength = caps.InputReportLength
            };
        }
    }

    static void OpenNewCollections()
    {
        foreach (var path in HidPaths())
        {
            lock (StateLock)
            {
                if (OpenPaths.Contains(path)) continue;
            }

            var collection = CollectionOf(path);
            if (collection == null || collection.InputReportLength == 0) continue;
            var handle = CreateFile(path, GenericRead, ShareReadWrite, IntPtr.Zero, OpenExisting, 0, IntPtr.Zero);
            if (handle.IsInvalid) continue;
            lock (StateLock) OpenPaths.Add(path);
            new Thread(() => Listen(collection, handle)) { IsBackground = true }.Start();
        }
    }

    static void Listen(Collection collection, SafeFileHandle handle)
    {
        try
        {
            using (var stream = new FileStream(handle, FileAccess.Read, collection.InputReportLength, false))
            {
                var report = new byte[collection.InputReportLength];
                while (stream.Read(report, 0, report.Length) > 0) OnReport(collection, report);
            }
        }
        catch (IOException) { }
        finally
        {
            handle.Dispose();
            lock (StateLock) OpenPaths.Remove(collection.Path);
        }
    }

    static void Send(HostEvent message)
    {
        var json = new MemoryStream();
        new DataContractJsonSerializer(typeof(HostEvent)).WriteObject(json, message);
        var body = json.ToArray();
        lock (StdoutLock)
        {
            var stdout = Console.OpenStandardOutput();
            stdout.Write(BitConverter.GetBytes(body.Length), 0, 4);
            stdout.Write(body, 0, body.Length);
            stdout.Flush();
        }
    }
}
