@title Recursion Practice

@beginq
@text What is a base case?
@text Hint: You can often find it by looking at the `if` condition.
@endq

@beginq
@text What does this function return?

@code
def add(n):
    if n == 0: return 0
    return n + add(n-1)
@endcode
@endq
