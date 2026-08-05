
import { LabExperiment, Difficulty } from './types';

export const LAB_EXPERIMENTS: LabExperiment[] = [
  {
    id: 'arithmetic-ops',
    title: 'Arithmetic Operations on Integers',
    category: 'Basics',
    difficulty: Difficulty.BEGINNER,
    description: 'Perform basic mathematical operations including addition, subtraction, multiplication, and division on two integer inputs.',
    learningObjectives: ['Input handling', 'Type casting', 'Mathematical operators'],
    starterCode: `a = int(input())\nb = int(input())\nprint(a + b)`,
    targetGrades: ['10', 'cls-grade-10-cs', 'Grade 10'],
    testCases: [
      { id: '1', input: '5\n10', expectedOutput: '15' },
      { id: '2', input: '100\n25', expectedOutput: '125' }
    ],
    status: 'published'
  },
  {
    id: 'fibonacci-adv',
    title: 'Fibonacci with Recursion',
    category: 'Algorithms',
    difficulty: Difficulty.ADVANCED,
    description: 'Generate the Fibonacci sequence using a recursive approach.',
    learningObjectives: ['Recursion', 'Base cases', 'Memory management'],
    starterCode: `def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n\nn = int(input())\nprint(fib(n))`,
    targetGrades: ['11', '12', 'cls-grade-12-cs', 'cls-grade-11-cs', 'Grade 11', 'Grade 12'],
    testCases: [
      { id: '1', input: '5', expectedOutput: '5' },
      { id: '2', input: '10', expectedOutput: '55' }
    ],
    status: 'published'
  },
  {
    id: 'data-structures-linked',
    title: 'Custom Stack Implementation',
    category: 'Data Structures',
    difficulty: Difficulty.ADVANCED,
    description: 'Implement a Stack data structure using lists in Python.',
    learningObjectives: ['Classes', 'OOP', 'List methods'],
    starterCode: `class Stack:\n    def __init__(self):\n        self.items = []\n    def push(self, item):\n        self.items.append(item)\n    def pop(self):\n        return self.items.pop()`,
    targetGrades: ['12', 'cls-grade-12-cs', 'Grade 12'],
    testCases: [
      { id: '1', input: 'push 5\npop', expectedOutput: '5' }
    ],
    status: 'published'
  },
  {
    id: 'factorial-recur',
    title: 'Factorial of a Number',
    category: 'Algorithms',
    difficulty: Difficulty.BEGINNER,
    description: 'Calculate the factorial of a non-negative integer using recursive function calls.',
    learningObjectives: ['Recursion', 'Mathematical logic', 'Conditional returns'],
    starterCode: `def factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n - 1)\n\nn = int(input())\nprint(factorial(n))`,
    targetGrades: ['11', 'cls-grade-11-cs', 'Grade 11'],
    testCases: [
      { id: '1', input: '5', expectedOutput: '120' },
      { id: '2', input: '4', expectedOutput: '24' }
    ],
    status: 'published'
  },
  {
    id: 'palindrome-checker',
    title: 'String & Number Palindrome Verification',
    category: 'Basics',
    difficulty: Difficulty.BEGINNER,
    description: 'Determine if a given input string or integer reads the same backwards and forwards.',
    learningObjectives: ['String slicing', 'Conditionals', 'Input validation'],
    starterCode: `text = input().strip()\nif text == text[::-1]:\n    print("Palindrome")\nelse:\n    print("Not Palindrome")`,
    targetGrades: ['11', 'cls-grade-11-cs', 'Grade 11'],
    testCases: [
      { id: '1', input: 'radar', expectedOutput: 'Palindrome' },
      { id: '2', input: 'python', expectedOutput: 'Not Palindrome' }
    ],
    status: 'published'
  },
  {
    id: 'matrix-addition',
    title: 'Matrix Addition & Manipulation',
    category: 'Data Structures',
    difficulty: Difficulty.INTERMEDIATE,
    description: 'Perform element-wise addition on two 2D integer matrices in Python.',
    learningObjectives: ['Nested loops', '2D lists', 'Matrix operations'],
    starterCode: `r, c = map(int, input().split())\nmat1 = [list(map(int, input().split())) for _ in range(r)]\nmat2 = [list(map(int, input().split())) for _ in range(r)]\nres = [[mat1[i][j] + mat2[i][j] for j in range(c)] for i in range(r)]\nfor row in res:\n    print(*(row))`,
    targetGrades: ['11', 'cls-grade-11-cs', 'Grade 11'],
    testCases: [
      { id: '1', input: '2 2\n1 2\n3 4\n5 6\n7 8', expectedOutput: '6 8\n10 12' }
    ],
    status: 'published'
  }
];
