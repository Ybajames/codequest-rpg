// npcs.js — Python skill teacher NPCs scattered around the island
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, box, addTo } from './state.js';
import { addCollider } from './collision.js';
import { getTerrainHeight } from './world.js';

// ── NPC DEFINITIONS ───────────────────────────────────────────────────────────
const NPC_CONFIGS = [
    {
        name:    '🟦 Vera the Variable',
        ability: 'Variable',
        pos:     { x: -18, z: -12 },
        color:   0x42a5f5,
        lesson:  'Variables store data.\nx = 5\nname = "Alice"',
        challenges: [
            {
                description: 'Create a variable called "score" and set it to 42.\nThen print it.',
                starter:     '# Create your variable below\n',
                hint:        'score = 42\nprint(score)',
                check: code => {
                    const hasVar   = /score\s*=\s*42/.test(code);
                    const hasPrint = /print\s*\(\s*score\s*\)/.test(code);
                    if (!hasVar)   return 'Missing: score = 42';
                    if (!hasPrint) return 'Missing: print(score)';
                    return true;
                },
                successMsg: 'Variables store values — like a labeled box!'
            },
            {
                description: 'Create TWO variables: "first_name" (your name as a string)\nand "age" (any number). Print both.',
                starter:     '# Two variables!\n',
                hint:        'first_name = "Ada"\nage = 20\nprint(first_name)\nprint(age)',
                check: code => {
                    if (!/first_name\s*=/.test(code))   return 'Missing: first_name = ...';
                    if (!/age\s*=\s*\d+/.test(code))    return 'Missing: age = (a number)';
                    if ((code.match(/print/g)||[]).length < 2) return 'Print both variables!';
                    return true;
                },
                successMsg: 'Now you can store any data in a variable!'
            },
            {
                description: 'Swap two variables without losing their values.\na = 10\nb = 20\n# After your code, a should be 20, b should be 10\nprint(a, b)',
                starter:     'a = 10\nb = 20\n# swap them here\n\nprint(a, b)',
                hint:        'a, b = b, a   # Python tuple swap!',
                check: code => {
                    if (!(/a\s*,\s*b\s*=\s*b\s*,\s*a/.test(code) || /temp/.test(code)))
                        return 'Try using a temp variable, or Python\'s tuple swap: a, b = b, a';
                    if (!/print\s*\(\s*a\s*,\s*b\s*\)/.test(code))
                        return 'Add: print(a, b)';
                    return true;
                },
                successMsg: 'Python tuple swap is elegant and fast!'
            },
        ],
    },
    {
        name:    '🟩 Pip the Printer',
        ability: 'Print',
        pos:     { x: 20, z: -14 },
        color:   0x66bb6a,
        lesson:  'print() shows output.\nprint("Hello!")\nprint(2 + 3)',
        challenges: [
            {
                description: 'Print exactly: Hello, World!',
                starter:     '',
                hint:        'print("Hello, World!")',
                check: code => {
                    if (!code.includes('print'))     return 'Use the print() function!';
                    if (!code.includes('Hello, World!')) return 'Print exactly: Hello, World!  (check punctuation)';
                    return true;
                },
                successMsg: 'The classic first program!'
            },
            {
                description: 'Use an f-string to print:\n"My name is X and I am Y years old"\n(replace X and Y with actual variable values)',
                starter:     'name = "Alex"\nage = 15\n# print with f-string\n',
                hint:        'print(f"My name is {name} and I am {age} years old")',
                check: code => {
                    if (!/f["']/.test(code))        return 'Use an f-string: f"..."';
                    if (!/{name}/.test(code))        return 'Include {name} in your f-string';
                    if (!/{age}/.test(code))         return 'Include {age} in your f-string';
                    return true;
                },
                successMsg: 'F-strings make formatting easy and readable!'
            },
        ],
    },
    {
        name:    '🟠 Lola the Logic',
        ability: 'Logic',
        pos:     { x: -20, z: 16 },
        color:   0xffa726,
        lesson:  'if / elif / else\ncontrol the flow.\nif x > 0:\n    print("positive")',
        challenges: [
            {
                description: 'Write code that:\n- Creates a variable "temp" = 35\n- If temp > 30, print "Hot!"\n- Otherwise print "Cool"',
                starter:     'temp = 35\n# your if/else here\n',
                hint:        'if temp > 30:\n    print("Hot!")\nelse:\n    print("Cool")',
                check: code => {
                    if (!/temp\s*=\s*35/.test(code))  return 'Keep: temp = 35';
                    if (!/if\s+temp/.test(code))       return 'Use an if statement with temp';
                    if (!/print/.test(code))           return 'Add a print statement';
                    return true;
                },
                successMsg: 'if/else lets your code make decisions!'
            },
            {
                description: 'Use elif to grade a score:\n- score >= 90 → print "A"\n- score >= 70 → print "B"\n- else → print "C"',
                starter:     'score = 85\n# grade the score\n',
                hint:        'if score >= 90:\n    print("A")\nelif score >= 70:\n    print("B")\nelse:\n    print("C")',
                check: code => {
                    if (!code.includes('elif'))       return 'Use elif for the second condition!';
                    if ((code.match(/print/g)||[]).length < 1) return 'Add print statements';
                    return true;
                },
                successMsg: 'elif chains let you handle multiple cases!'
            },
            {
                description: 'Use "and" / "or":\nIf a number is between 1 and 10 (inclusive), print "In range"\nOtherwise print "Out of range"\n(test with n = 7)',
                starter:     'n = 7\n# your code\n',
                hint:        'if n >= 1 and n <= 10:\n    print("In range")\nelse:\n    print("Out of range")',
                check: code => {
                    if (!/and|or/.test(code))        return 'Use "and" or "or" operator!';
                    if (!/print/.test(code))         return 'Add print statement';
                    return true;
                },
                successMsg: 'Logical operators combine conditions!'
            },
        ],
    },
    {
        name:    '🔴 Leon the Loop',
        ability: 'Loop',
        pos:     { x: 22, z: 18 },
        color:   0xef5350,
        lesson:  'for i in range(5):\n    print(i)\nLoops repeat code!',
        challenges: [
            {
                description: 'Use a for loop to print numbers 1 through 5\n(one per line)',
                starter:     '# Use range(1, 6)\n',
                hint:        'for i in range(1, 6):\n    print(i)',
                check: code => {
                    if (!/for\s+\w+\s+in\s+range/.test(code)) return 'Use a for loop with range()!';
                    if (!/print/.test(code))                   return 'Add print inside the loop';
                    return true;
                },
                successMsg: 'range(1, 6) gives 1, 2, 3, 4, 5!'
            },
            {
                description: 'Use a loop to calculate the sum of 1 to 10.\nPrint the final total.',
                starter:     'total = 0\n# loop from 1 to 10\n\nprint(total)',
                hint:        'total = 0\nfor i in range(1, 11):\n    total += i\nprint(total)',
                check: code => {
                    if (!/total\s*=\s*0/.test(code))           return 'Start with: total = 0';
                    if (!/total\s*\+=/.test(code))             return 'Use total += i inside the loop';
                    if (!/print\s*\(\s*total\s*\)/.test(code)) return 'Print total at the end';
                    return true;
                },
                successMsg: 'Accumulator pattern: total += i in a loop!'
            },
            {
                description: 'Use a while loop to count DOWN from 5 to 1,\nprinting each number. Then print "Blastoff!"',
                starter:     'count = 5\n# while loop countdown\n',
                hint:        'count = 5\nwhile count >= 1:\n    print(count)\n    count -= 1\nprint("Blastoff!")',
                check: code => {
                    if (!/while/.test(code))           return 'Use a while loop!';
                    if (!/count\s*-=\s*1/.test(code))  return 'Decrease count with: count -= 1';
                    if (!code.includes('Blastoff'))    return 'Print "Blastoff!" after the loop';
                    return true;
                },
                successMsg: 'while loops run until a condition is False!'
            },
        ],
    },
    {
        name:    '🟣 Faye the Function',
        ability: 'Function',
        pos:     { x: -22, z: -20 },
        color:   0xab47bc,
        lesson:  'def greet(name):\n    return "Hi " + name\n\nFunctions are reusable!',
        challenges: [
            {
                description: 'Define a function called "square" that takes\na number n and returns n * n.\nThen print square(5).',
                starter:     '# def your function\n\n',
                hint:        'def square(n):\n    return n * n\n\nprint(square(5))',
                check: code => {
                    if (!/def\s+square\s*\(\s*n\s*\)/.test(code)) return 'Define: def square(n):';
                    if (!/return\s+n\s*\*\s*n/.test(code))        return 'Return n * n';
                    if (!/print\s*\(\s*square\s*\(\s*5\s*\)\s*\)/.test(code)) return 'Print: print(square(5))';
                    return true;
                },
                successMsg: 'Functions reuse logic — write once, call many times!'
            },
            {
                description: 'Write a function "greet" that takes a "name"\nparameter and returns "Hello, {name}!"\nCall it with your own name and print the result.',
                starter:     '# define greet(name)\n',
                hint:        'def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Ada"))',
                check: code => {
                    if (!/def\s+greet\s*\(\s*name\s*\)/.test(code)) return 'Define: def greet(name):';
                    if (!/return/.test(code))                        return 'Use return in the function!';
                    if (!/print\s*\(\s*greet/.test(code))            return 'Call and print: print(greet(...))';
                    return true;
                },
                successMsg: 'Parameters let functions work with any input!'
            },
        ],
    },
    {
        name:    '🔵 Iris the Input',
        ability: 'Input',
        pos:     { x: 16, z: -22 },
        color:   0x26c6da,
        lesson:  'name = input("Enter name: ")\nTakes input from the user!',
        challenges: [
            {
                description: 'Write code that:\n1. Asks for a name using input()\n2. Prints "Nice to meet you, {name}!"',
                starter:     '# Ask for a name\n',
                hint:        'name = input("Enter your name: ")\nprint(f"Nice to meet you, {name}!")',
                check: code => {
                    if (!/input\s*\(/.test(code))  return 'Use the input() function!';
                    if (!/print/.test(code))        return 'Print a greeting!';
                    return true;
                },
                successMsg: 'input() makes your programs interactive!'
            },
            {
                description: 'Ask for a number, convert it to int,\nthen print whether it is even or odd.\n(Hint: use num % 2)',
                starter:     '# get a number from user\n# convert with int()\n# check even/odd\n',
                hint:        'num = int(input("Enter a number: "))\nif num % 2 == 0:\n    print("Even")\nelse:\n    print("Odd")',
                check: code => {
                    if (!/int\s*\(\s*input/.test(code))  return 'Convert with: int(input(...))';
                    if (!/\%\s*2/.test(code))            return 'Use % 2 to check even/odd';
                    if (!/print/.test(code))             return 'Print the result';
                    return true;
                },
                successMsg: 'Always convert input() when you need a number!'
            },
        ],
    },
];

// ── BUILD NPC MESHES ──────────────────────────────────────────────────────────
export const npcs = [];

NPC_CONFIGS.forEach(cfg => {
    const g = new THREE.Group();
    g.position.set(cfg.pos.x, getTerrainHeight(cfg.pos.x, cfg.pos.z), cfg.pos.z);
    scene.add(g);

    const mat      = new THREE.MeshLambertMaterial({ color: cfg.color });
    const darkMat  = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
    const glowMat  = new THREE.MeshLambertMaterial({
        color: cfg.color, emissive: cfg.color, emissiveIntensity: 0.7
    });

    // body — bottom at y=0.55, top at y=1.55
    addTo(g, box(0.8, 1.0, 0.5, mat), 0, 1.05, 0);
    // head — sits on top of body
    const head = box(0.6, 0.6, 0.6, mat);
    addTo(g, head, 0, 1.85, 0);
    // face screen
    addTo(g, box(0.38, 0.22, 0.05, darkMat), 0, 1.88, 0.32);
    // eye dots
    addTo(g, box(0.10, 0.08, 0.04, glowMat), -0.10, 1.90, 0.35);
    addTo(g, box(0.10, 0.08, 0.04, glowMat),  0.10, 1.90, 0.35);
    // arms — alongside body
    addTo(g, box(0.20, 0.65, 0.20, mat), -0.55, 1.05, 0);
    addTo(g, box(0.20, 0.65, 0.20, mat),  0.55, 1.05, 0);
    // legs — bottom at y=0 (ground), top connects to body at y=0.55
    addTo(g, box(0.22, 0.55, 0.22, darkMat), -0.22, 0.275, 0);
    addTo(g, box(0.22, 0.55, 0.22, darkMat),  0.22, 0.275, 0);

    // label sign
    const canvas  = document.createElement('canvas');
    canvas.width  = 512; canvas.height = 80;
    const ctx     = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 512, 80);
    ctx.fillStyle = `#${cfg.color.toString(16).padStart(6,'0')}`;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(cfg.name, 256, 50);
    const tex = new THREE.CanvasTexture(canvas);
    const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 0.5),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false })
    );
    sign.position.set(0, 3.0, 0);
    sign.renderOrder = 1;
    g.add(sign);

    // glow light
    const light = new THREE.PointLight(cfg.color, 0.8, 6);
    light.position.set(0, 1.8, 0);
    g.add(light);

    // store userData for interaction
    g.userData = {
        ...cfg,
        light,
        currentChallenge: 0,
        solved: [],
    };

    addCollider(cfg.pos.x, cfg.pos.z, 1.2);
    npcs.push(g);
});
