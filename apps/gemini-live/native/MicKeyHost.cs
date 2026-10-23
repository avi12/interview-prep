using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Microsoft.Win32.SafeHandles;

static class MicKeyHost
{
    const string RoccatHordeAimo = "vid_1e7d&pid_303e";
    const ushort EventUsagePage = 0x000A;
    const int RetryMs = 2000;
    const string M1Message = "{\"type\":\"m1\"}";
    static readonly byte[] M1Press = { 0x03, 0x00, 0x19, 0x7D, 0x00 };
    static readonly object StdoutLock = new object();

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
        new Thread(ExitWhenChromeLeaves) { IsBackground = true }.Start();
        while (true)
        {
            var path = FindEventChannel();
            if (path != null) Listen(path);
            Thread.Sleep(RetryMs);
        }
    }

    static void ExitWhenChromeLeaves()
    {
        var stdin = Console.OpenStandardInput();
        var buffer = new byte[4096];
        try { while (stdin.Read(buffer, 0, buffer.Length) > 0) { } } catch (IOException) { }
        Environment.Exit(0);
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

    static HidCaps CapsOf(string path)
    {
        var caps = new HidCaps();
        using (var handle = CreateFile(path, 0, ShareReadWrite, IntPtr.Zero, OpenExisting, 0, IntPtr.Zero))
        {
            IntPtr data;
            if (handle.IsInvalid || !HidD_GetPreparsedData(handle, out data)) return caps;
            HidP_GetCaps(data, ref caps);
            HidD_FreePreparsedData(data);
        }
        return caps;
    }

    static string FindEventChannel()
    {
        foreach (var path in HidPaths())
        {
            if (path.IndexOf(RoccatHordeAimo, StringComparison.OrdinalIgnoreCase) < 0) continue;
            var caps = CapsOf(path);
            if (caps.UsagePage == EventUsagePage && caps.InputReportLength >= M1Press.Length) return path;
        }
        return null;
    }

    static void Listen(string path)
    {
        var caps = CapsOf(path);
        using (var handle = CreateFile(path, GenericRead, ShareReadWrite, IntPtr.Zero, OpenExisting, 0, IntPtr.Zero))
        {
            if (handle.IsInvalid) return;
            using (var stream = new FileStream(handle, FileAccess.Read, caps.InputReportLength, false))
            {
                var report = new byte[caps.InputReportLength];
                try
                {
                    while (stream.Read(report, 0, report.Length) > 0)
                        if (IsM1Press(report)) Send(M1Message);
                }
                catch (IOException) { }
            }
        }
    }

    static bool IsM1Press(byte[] report)
    {
        for (var index = 0; index < M1Press.Length; index++)
            if (report[index] != M1Press[index]) return false;
        return true;
    }

    static void Send(string json)
    {
        var body = Encoding.UTF8.GetBytes(json);
        lock (StdoutLock)
        {
            var stdout = Console.OpenStandardOutput();
            stdout.Write(BitConverter.GetBytes(body.Length), 0, 4);
            stdout.Write(body, 0, body.Length);
            stdout.Flush();
        }
    }
}
