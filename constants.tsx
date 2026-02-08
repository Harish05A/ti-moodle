
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
    targetGrades: ['10'],
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
    targetGrades: ['11', '12'],
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
    targetGrades: ['12'],
    testCases: [
      { id: '1', input: 'push 5\npop', expectedOutput: '5' }
    ],
    status: 'published'
  }
];
