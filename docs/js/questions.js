// questions.js — Python challenge bank for all three games
// Each question: { q, code?, options, answer, explanation, topic, difficulty }

export const QUESTIONS = [
    // ── VARIABLES ─────────────────────────────────────────────────────────────
    {
        topic: 'Variables', difficulty: 1,
        q: 'What value does x hold after this code?\n\nx = 5\nx = x + 3',
        options: ['5', '3', '8', '53'],
        answer: '8',
        explanation: 'x starts at 5, then x + 3 = 8 is assigned back to x.'
    },
    {
        topic: 'Variables', difficulty: 1,
        q: 'Which line correctly creates a variable called "score" with value 100?',
        options: ['score == 100', 'score = 100', '100 = score', 'var score = 100'],
        answer: 'score = 100',
        explanation: 'In Python, = is the assignment operator. var is not used.'
    },
    {
        topic: 'Variables', difficulty: 2,
        q: 'What is printed?\n\na = 10\nb = a\na = 20\nprint(b)',
        options: ['10', '20', '30', 'Error'],
        answer: '10',
        explanation: 'b = a copies the value 10. Changing a later does not affect b.'
    },

    // ── PRINT ─────────────────────────────────────────────────────────────────
    {
        topic: 'Print', difficulty: 1,
        q: 'What does this print?\n\nprint("Hello", "World")',
        options: ['HelloWorld', 'Hello World', '"Hello" "World"', 'Error'],
        answer: 'Hello World',
        explanation: 'print() separates multiple arguments with a space by default.'
    },
    {
        topic: 'Print', difficulty: 1,
        q: 'What does this print?\n\nname = "Ada"\nprint(f"Hello, {name}!")',
        options: ['Hello, {name}!', 'Hello, Ada!', 'f"Hello, Ada!"', 'Error'],
        answer: 'Hello, Ada!',
        explanation: 'f-strings insert variable values inside { }.'
    },
    {
        topic: 'Print', difficulty: 2,
        q: 'What does this print?\n\nprint(2 + 3)\nprint("2 + 3")',
        options: ['5\n5', '2+3\n2+3', '5\n2 + 3', 'Error'],
        answer: '5\n2 + 3',
        explanation: 'Without quotes, 2+3 is evaluated. With quotes, it\'s a string.'
    },

    // ── INPUT ─────────────────────────────────────────────────────────────────
    {
        topic: 'Input', difficulty: 1,
        q: 'Which code asks the user for their name?',
        options: [
            'name = print("Your name?")',
            'name = input("Your name: ")',
            'name == input("Your name: ")',
            'input(name)'
        ],
        answer: 'name = input("Your name: ")',
        explanation: 'input() returns what the user types; assign it with =.'
    },
    {
        topic: 'Input', difficulty: 2,
        q: 'What type does input() always return?',
        options: ['int', 'float', 'str', 'bool'],
        answer: 'str',
        explanation: 'input() always returns a string. Use int() or float() to convert.'
    },

    // ── LOGIC / CONDITIONALS ──────────────────────────────────────────────────
    {
        topic: 'Logic', difficulty: 1,
        q: 'What is printed?\n\nx = 10\nif x > 5:\n    print("big")\nelse:\n    print("small")',
        options: ['big', 'small', 'big\nsmall', 'Error'],
        answer: 'big',
        explanation: '10 > 5 is True, so the if-block runs.'
    },
    {
        topic: 'Logic', difficulty: 2,
        q: 'Which operator checks if two values are EQUAL?',
        options: ['=', '==', '!=', '=>'],
        answer: '==',
        explanation: '= assigns a value; == compares two values.'
    },
    {
        topic: 'Logic', difficulty: 2,
        q: 'What is printed?\n\nage = 17\nif age >= 18:\n    print("adult")\nelif age >= 13:\n    print("teen")\nelse:\n    print("child")',
        options: ['adult', 'teen', 'child', 'Error'],
        answer: 'teen',
        explanation: '17 >= 18 is False, but 17 >= 13 is True → "teen".'
    },
    {
        topic: 'Logic', difficulty: 3,
        q: 'What does this print?\n\nx = 5\ny = 10\nif x > 3 and y < 20:\n    print("yes")\nelse:\n    print("no")',
        options: ['yes', 'no', 'Error', 'True'],
        answer: 'yes',
        explanation: 'Both x > 3 (True) and y < 20 (True) → and = True.'
    },

    // ── LOOPS ─────────────────────────────────────────────────────────────────
    {
        topic: 'Loop', difficulty: 1,
        q: 'How many times does this loop run?\n\nfor i in range(5):\n    print(i)',
        options: ['4', '5', '6', '1'],
        answer: '5',
        explanation: 'range(5) gives 0,1,2,3,4 — that\'s 5 numbers.'
    },
    {
        topic: 'Loop', difficulty: 2,
        q: 'What is printed?\n\ntotal = 0\nfor n in range(1, 4):\n    total += n\nprint(total)',
        options: ['3', '6', '10', '0'],
        answer: '6',
        explanation: '1 + 2 + 3 = 6. range(1,4) gives 1, 2, 3.'
    },
    {
        topic: 'Loop', difficulty: 2,
        q: 'What does a while loop need to avoid running forever?',
        options: [
            'A return statement',
            'A break somewhere',
            'A condition that eventually becomes False',
            'An else block'
        ],
        answer: 'A condition that eventually becomes False',
        explanation: 'The while loop keeps going while its condition is True. It must eventually become False.'
    },
    {
        topic: 'Loop', difficulty: 3,
        q: 'What does this print?\n\nfor i in range(3):\n    if i == 1:\n        continue\n    print(i)',
        options: ['0\n1\n2', '0\n2', '1', '0\n1'],
        answer: '0\n2',
        explanation: 'continue skips the rest of the loop body for i=1.'
    },

    // ── FUNCTIONS ─────────────────────────────────────────────────────────────
    {
        topic: 'Function', difficulty: 1,
        q: 'Which line correctly defines a function called "greet"?',
        options: [
            'function greet():',
            'def greet():',
            'define greet():',
            'fun greet():'
        ],
        answer: 'def greet():',
        explanation: 'Python uses "def" to define functions.'
    },
    {
        topic: 'Function', difficulty: 2,
        q: 'What is printed?\n\ndef double(n):\n    return n * 2\n\nprint(double(4))',
        options: ['4', '8', '2', 'None'],
        answer: '8',
        explanation: 'double(4) returns 4 * 2 = 8.'
    },
    {
        topic: 'Function', difficulty: 2,
        q: 'What is printed?\n\ndef add(a, b=10):\n    return a + b\n\nprint(add(5))',
        options: ['5', '10', '15', 'Error'],
        answer: '15',
        explanation: 'b defaults to 10. add(5) = 5 + 10 = 15.'
    },

    // ── LISTS ─────────────────────────────────────────────────────────────────
    {
        topic: 'List', difficulty: 1,
        q: 'What does this print?\n\nnums = [10, 20, 30]\nprint(nums[1])',
        options: ['10', '20', '30', 'Error'],
        answer: '20',
        explanation: 'Lists are zero-indexed. Index 1 is the second element: 20.'
    },
    {
        topic: 'List', difficulty: 2,
        q: 'Which method adds an item to the END of a list?',
        options: ['.add()', '.push()', '.append()', '.insert()'],
        answer: '.append()',
        explanation: 'list.append(item) adds to the end. insert() adds at a position.'
    },
    {
        topic: 'List', difficulty: 2,
        q: 'What is printed?\n\nfruits = ["apple", "banana", "cherry"]\nprint(len(fruits))',
        options: ['2', '3', '4', 'Error'],
        answer: '3',
        explanation: 'len() returns the number of items. The list has 3 items.'
    },

    // ── STRINGS ───────────────────────────────────────────────────────────────
    {
        topic: 'String', difficulty: 1,
        q: 'What does this print?\n\ns = "Python"\nprint(s[0])',
        options: ['P', 'y', 'Python', 'Error'],
        answer: 'P',
        explanation: 'Strings are indexed like lists. Index 0 is the first character.'
    },
    {
        topic: 'String', difficulty: 2,
        q: 'What does this print?\n\ns = "hello world"\nprint(s.upper())',
        options: ['hello world', 'Hello World', 'HELLO WORLD', 'Error'],
        answer: 'HELLO WORLD',
        explanation: '.upper() converts all characters to uppercase.'
    },

    // ── DICTIONARIES ──────────────────────────────────────────────────────────
    {
        topic: 'Dictionary', difficulty: 2,
        q: 'What is printed?\n\nstudent = {"name": "Ada", "grade": 95}\nprint(student["name"])',
        options: ['"name"', 'Ada', '95', 'Error'],
        answer: 'Ada',
        explanation: 'Access dictionary values by their key: student["name"] = "Ada".'
    },
    {
        topic: 'Dictionary', difficulty: 3,
        q: 'Which method returns all keys of a dictionary?',
        options: ['.keys()', '.values()', '.items()', '.get()'],
        answer: '.keys()',
        explanation: 'dict.keys() returns a view of all keys.'
    },

    // ── CLASSES ───────────────────────────────────────────────────────────────
    {
        topic: 'Class', difficulty: 3,
        q: 'What does __init__ do in a Python class?',
        options: [
            'Deletes the object',
            'Initializes the object when created',
            'Defines a static method',
            'Imports a module'
        ],
        answer: 'Initializes the object when created',
        explanation: '__init__ is the constructor — it runs when you create a new instance.'
    },
    {
        topic: 'Class', difficulty: 3,
        q: 'What is printed?\n\nclass Dog:\n    def __init__(self, name):\n        self.name = name\n    def bark(self):\n        print(f"{self.name} says woof!")\n\nd = Dog("Rex")\nd.bark()',
        options: ['woof!', 'Rex says woof!', 'Dog says woof!', 'Error'],
        answer: 'Rex says woof!',
        explanation: 'self.name = "Rex", so the f-string prints "Rex says woof!"'
    },
];

// Shuffle helper
export function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Get N random questions, optionally filtered by topic
export function getQuestions(n = 10, topic = null) {
    let pool = topic ? QUESTIONS.filter(q => q.topic === topic) : QUESTIONS;
    return shuffle(pool).slice(0, n);
}
