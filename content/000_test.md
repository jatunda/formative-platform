@title Intro to Recursion

@q What is a base case?

@code
def factorial(n):
    if n == 0: return 1
    return n * factorial(n-1)
@endcode

@q What would factorial(3) return?
