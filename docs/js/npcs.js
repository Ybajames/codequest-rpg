// npcs.js — NPC challenge data + character builder
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, MAT, box, addTo } from './state.js';
import { addCollider } from './collision.js';

// Each NPC has 5 challenges — easy to hard, more XP each time
// xp field on each challenge controls the reward
export const NPC_DATA = [
    {
        name: "VARIABLES TEACHER",
        color: 0xe74c3c,
        challenges: [
            {
                level: 1,
                challenge: "Store the number 10 in a variable called score.\n\nExample:  age = 25",
                hint: "Type:  score = 10",
                solutions: ["score=10", "score = 10"],
                xp: 20,
            },
            {
                level: 2,
                challenge: "Store your name as a string in a variable called name.\n\nStrings use quotes: name = 'Alice'",
                hint: "Type:  name = 'Alice'  (any name works!)",
                solutions: ["name={string}", "name = {string}"],
                xp: 25,
            },
            {
                level: 3,
                challenge: "Create two variables:\n  x = 5\n  y = 3\n\nThen store their sum in a variable called total.",
                hint: "Type:  total = x + y",
                solutions: ["total=x+y", "total = x + y", "total=x + y", "total = x+y"],
                xp: 35,
            },
            {
                level: 4,
                challenge: "Swap two variables.\n\nIf a = 1 and b = 2,\nstore the value of b in a.",
                hint: "Type:  a = b",
                solutions: ["a=b", "a = b"],
                xp: 40,
            },
            {
                level: 5,
                challenge: "Create a variable called isActive and set it to True.\n\nBooleans in Python are True or False (capital T or F).",
                hint: "Type:  isActive = True",
                solutions: ["isactive=true", "isactive = true", "isActive=True", "isActive = True"],
                xp: 50,
            },
        ],
        lesson: "VARIABLES\nStore data with a name.\nPress E to take the challenge!",
        ability: "Variable",
    },
    {
        name: "CONSTANTS TEACHER",
        color: 0xf39c12,
        challenges: [
            {
                level: 1,
                challenge: "Create a constant called PI and set it to 3.14\n\nIn Python, constants use UPPERCASE names.",
                hint: "Type:  PI = 3.14",
                solutions: ["pi=3.14","pi = 3.14","PI=3.14","PI = 3.14"],
                xp: 20,
            },
            {
                level: 2,
                challenge: "Create a constant called MAX_SCORE and set it to 100.",
                hint: "Type:  MAX_SCORE = 100",
                solutions: ["max_score=100","max_score = 100","MAX_SCORE=100","MAX_SCORE = 100"],
                xp: 25,
            },
            {
                level: 3,
                challenge: "Create a constant called GRAVITY and set it to 9.8",
                hint: "Type:  GRAVITY = 9.8",
                solutions: ["gravity=9.8","gravity = 9.8","GRAVITY=9.8","GRAVITY = 9.8"],
                xp: 35,
            },
            {
                level: 4,
                challenge: "Create a constant called APP_NAME and set it to 'CodeQuest'",
                hint: "Type:  APP_NAME = 'CodeQuest'",
                solutions: ["app_name={string}", "app_name = {string}", "APP_NAME={string}", "APP_NAME = {string}"],
                xp: 40,
            },
            {
                level: 5,
                challenge: "Create two constants:\n  WIDTH = 800\n  HEIGHT = 600",
                hint: "Type both on separate lines",
                solutions: ["width=800","width = 800","WIDTH=800","WIDTH = 800"],
                xp: 50,
            },
        ],
        lesson: "CONSTANTS\nValues that never change.\nPress E to take the challenge!",
        ability: "Constant",
    },
    {
        name: "PRINT TEACHER",
        color: 0x9b59b6,
        challenges: [
            {
                level: 1,
                challenge: "Print the message: Hello World\n\nUse the print() function.",
                hint: "Type:  print('Hello World')",
                solutions: ["print('hello world')","print(\"hello world\")","print('Hello World')","print(\"Hello World\")"],
                xp: 20,
            },
            {
                level: 2,
                challenge: "Print your name using a variable.\n\nname = 'Alex'\nprint(name)",
                hint: "Type:  print(name)",
                solutions: ["print(name)"],
                xp: 25,
            },
            {
                level: 3,
                challenge: "Print two words together using +\n\nExample: print('Hello' + ' World')",
                hint: "Type:  print('Hello' + ' World')",
                solutions: ["print('hello'+'world')","print('hello' + 'world')","print('Hello'+'World')","print('Hello' + ' World')","print('hello'+' world')"],
                xp: 35,
            },
            {
                level: 4,
                challenge: "Print a number alongside text using a comma.\n\nExample: print('Score:', 10)",
                hint: "Type:  print('Score:', 10)",
                solutions: ["print('score:',10)","print('score:', 10)","print('Score:',10)","print('Score:', 10)"],
                xp: 40,
            },
            {
                level: 5,
                challenge: "Use an f-string to print a variable inside text.\n\nname = 'Alex'\nprint(f'Hello {name}')",
                hint: "Type:  print(f'Hello {name}')",
                solutions: ["print(f'hello {name}')","print(f'Hello {name}')","print(f\"hello {name}\")","print(f\"Hello {name}\")"],
                xp: 50,
            },
        ],
        lesson: "PRINT\nShow output to the user.\nPress E to take the challenge!",
        ability: "Print",
    },
    {
        name: "INPUT TEACHER",
        color: 0x1abc9c,
        challenges: [
            {
                level: 1,
                challenge: "Ask the user for their name and store it in a variable called name.",
                hint: "Type:  name = input()",
                solutions: ["name=input()","name = input()",'name=input("")','name = input("")'],
                xp: 20,
            },
            {
                level: 2,
                challenge: "Ask the user for their age with a prompt message.\n\nExample: age = input('How old are you? ')",
                hint: "Type:  age = input('How old are you? ')",
                solutions: ["age=input('how old are you?')","age = input('how old are you?')",
                            "age=input('How old are you? ')","age = input('How old are you? ')"],
                xp: 25,
            },
            {
                level: 3,
                challenge: "Get a number from the user and convert it to an integer.\n\nExample: num = int(input())",
                hint: "Type:  num = int(input())",
                solutions: ["num=int(input())","num = int(input())"],
                xp: 35,
            },
            {
                level: 4,
                challenge: "Ask the user for two numbers and store them in x and y.",
                hint: "Type:  x = input()  then  y = input()",
                solutions: ["x=input()","x = input()"],
                xp: 40,
            },
            {
                level: 5,
                challenge: "Get a number from the user and convert it to a float.\n\nExample: price = float(input())",
                hint: "Type:  price = float(input())",
                solutions: ["price=float(input())","price = float(input())"],
                xp: 50,
            },
        ],
        lesson: "INPUT\nRead data from the user.\nPress E to take the challenge!",
        ability: "Input",
    },
    {
        name: "LOGIC TEACHER",
        color: 0xe67e22,
        challenges: [
            {
                level: 1,
                challenge: "Write an if statement that checks if score is greater than 5.\n\nDon't forget the colon!",
                hint: "Type:  if score > 5:",
                solutions: ["if score > 5:","if score>5:"],
                xp: 20,
            },
            {
                level: 2,
                challenge: "Write an if statement that checks if a number equals 10.\n\nUse == to check equality.",
                hint: "Type:  if number == 10:",
                solutions: ["if number == 10:","if number==10:"],
                xp: 25,
            },
            {
                level: 3,
                challenge: "Write an if/else statement.\n\nif score > 5:\n    print('Win')\nelse:",
                hint: "Type:  else:",
                solutions: ["else:"],
                xp: 35,
            },
            {
                level: 4,
                challenge: "Check two conditions at once using 'and'.\n\nExample: if x > 0 and x < 10:",
                hint: "Type:  if x > 0 and x < 10:",
                solutions: ["if x > 0 and x < 10:","if x>0 and x<10:"],
                xp: 40,
            },
            {
                level: 5,
                challenge: "Write an elif statement.\n\nif score > 10:\n    pass\nelif score == 5:",
                hint: "Type:  elif score == 5:",
                solutions: ["elif score == 5:","elif score==5:"],
                xp: 50,
            },
        ],
        lesson: "IF STATEMENTS\nMake decisions in code.\nPress E to take the challenge!",
        ability: "Logic",
    },
    {
        name: "LOOPS TEACHER",
        color: 0x3498db,
        challenges: [
            {
                level: 1,
                challenge: "Write a for loop that runs exactly 5 times.\n\nUse range() to control how many times.",
                hint: "Type:  for i in range(5):",
                solutions: ["for i in range(5):","for i in range( 5 ):"],
                xp: 20,
            },
            {
                level: 2,
                challenge: "Write a for loop that counts from 1 to 10.\n\nrange(start, stop) — stop is not included!",
                hint: "Type:  for i in range(1, 11):",
                solutions: ["for i in range(1, 11):","for i in range(1,11):"],
                xp: 25,
            },
            {
                level: 3,
                challenge: "Write a while loop that runs while x is less than 5.\n\nwhile condition:",
                hint: "Type:  while x < 5:",
                solutions: ["while x < 5:","while x<5:"],
                xp: 35,
            },
            {
                level: 4,
                challenge: "Write a for loop that loops over a list called items.\n\nfor item in list:",
                hint: "Type:  for item in items:",
                solutions: ["for item in items:"],
                xp: 40,
            },
            {
                level: 5,
                challenge: "Write a for loop with range that counts in steps of 2.\n\nrange(start, stop, step)",
                hint: "Type:  for i in range(0, 10, 2):",
                solutions: ["for i in range(0, 10, 2):","for i in range(0,10,2):"],
                xp: 50,
            },
        ],
        lesson: "LOOPS\nRepeat actions easily.\nPress E to take the challenge!",
        ability: "Loop",
    },
];

// build one NPC character mesh
export function makeNPC(x, z, dataIndex) {
    const data    = NPC_DATA[dataIndex];
    const color   = data.color;
    const g       = new THREE.Group();
    g.position.set(x, 0, z);

    const bodyMat  = new THREE.MeshLambertMaterial({ color });
    const hatMat   = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).offsetHSL(0, 0, -0.1) });
    const skinMat  = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const eyeMat   = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const pantsMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).offsetHSL(0, 0, -0.2) });

    addTo(g, box(0.8, 1.0, 0.4, bodyMat), 0, 1.5, 0);
    const head = box(0.8, 0.8, 0.8, skinMat);
    addTo(g, head, 0, 2.4, 0);
    addTo(head, box(0.15, 0.12, 0.05, eyeMat), -0.2, 0.05, 0.42);
    addTo(head, box(0.15, 0.12, 0.05, eyeMat),  0.2, 0.05, 0.42);
    addTo(g, box(0.3, 0.9, 0.3, bodyMat), -0.55, 1.55, 0);
    addTo(g, box(0.3, 0.9, 0.3, bodyMat),  0.55, 1.55, 0);
    addTo(g, box(0.35, 0.9, 0.35, pantsMat), -0.22, 0.55, 0);
    addTo(g, box(0.35, 0.9, 0.35, pantsMat),  0.22, 0.55, 0);
    addTo(head, box(1.1, 0.12, 1.1, hatMat), 0, 0.46, 0);
    addTo(head, box(0.7, 0.55, 0.7, hatMat), 0, 0.75, 0);

    // glowing nameplate
    const nameMat = new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.3 });
    addTo(g, box(1.4, 0.4, 0.05, nameMat), 0, 3.6, 0);

    const npcLight = new THREE.PointLight(new THREE.Color(color), 0.8, 6);
    npcLight.position.set(0, 2, 0);
    g.add(npcLight);

    // store challenge data + progress on the NPC
    g.userData = {
        ...data,
        light: npcLight,
        currentChallenge: 0,    // index into challenges array
        completed: [],           // which challenge levels are done
    };

    scene.add(g);
    addCollider(x, z, 1.2);
    return g;
}

// place all 6 teachers around the plaza
export const npcs = [
    makeNPC(-12,  0,  0), // Variables
    makeNPC( 12,  0,  1), // Constants
    makeNPC(  0, -12, 2), // Print
    makeNPC(-12, 12,  3), // Input
    makeNPC( 12, 12,  4), // Logic
    makeNPC(  0, 12,  5), // Loops
];
