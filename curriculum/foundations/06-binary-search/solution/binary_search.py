def search(nums, target):
    low = 0
    high = len(nums) - 1
    while low <= high:
        middle = low + (high - low) // 2
        value = nums[middle]
        if value == target:
            return middle
        if value < target:
            low = middle + 1
            continue
        high = middle - 1
    return -1
