// ─────────────────────────────────────────────────────────────────────────────
//  npcs.js
//  Defines all NPC challenge data and builds NPC characters in the world.
//
//  NPC_DATA — the full list of challenges, hints, solutions for each teacher
//  makeNPC() — builds one NPC mesh and registers its collider
//  npcs — the array of all 6 teacher groups in the scene
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, MAT, box, addTo } from './state.js';
import { addCollider } from './collision.js';

// ── CHALLENGE DATA ────────────────────────────────────────────────────────────
// Each entry is one NPC teacher.
// Fields:
//   name       — shown in the terminal header
//   lesson     — shown in the status panel when player is nearby
//   challenge  — the Python task shown inside the terminal
//   hint       — shown when student clicks Hint or gets 2 wrong answers
//   solutions  — array of accepted answers (we normalize before comparing)
//   ability    — the power unlocked on success
export const NPC_DATA = [
    {
        name: "VARIABLES TEACHER",
        lesson: "VARIABLES\nStore data with a name.\nPress E to take the challenge!",
        challenge: "Store the number 10 in a variable called score.\n\nExample:  age = 25",
        hint: "Type:  score = 10",
        solutions: ["score=10", "score = 10"],
        ability: "Variable",
    },
    {
        name: "CONSTANTS TEACHER",
        lesson: "CONSTANTS\nValues that never change.\nPress E to take the challenge!",
        challenge: "Create a constant called PI and set it to 3.14\n\nIn Python, constants use UPPERCASE names.",
        hint: "Type:  PI = 3.14",
        solutions: ["pi=3.14", "pi = 3.14", "PI=3.14", "PI = 3.14"],
        ability: "Constant",
    },
    {
        name: "PRINT TEACHER",
        lesson: "PRINT\nShow output to the user.\nPress E to take the challenge!",
        challenge: "Print the message: Hello World\n\nUse the print() function.",
        hint: "Type:  print('Hello World')",
        solutions: [
            "print('hello world')", 'print("hello world")',
            "print('Hello World')", 'print("Hello World")',
        ],
        ability: "Print",
    },
    {
        name: "INPUT TEACHER",
        lesson: "INPUT\nRead data from the user.\nPress E to take the challenge!",
        challenge: "Ask the user for their name and store it in a variable called name.\n\nUse the input() function.",
        hint: "Type:  name = input()",
        solutions: ["name=input()", "name = input()", 'name=input("")', 'name = input("")'],
        ability: "Input",
    },
    {
        name: "LOGIC TEACHER",
        lesson: "IF STATEMENTS\nMake decisions in code.\nPress E to take the challenge!",
        challenge: "Write an if statement that checks if score is greater than 5.\n\nDon't forget the colon at the end!",
        hint: "Type:  if score > 5:",
        solutions: ["if score > 5:", "if score>5:"],
        ability: "Logic",
    },
    {
        name: "LOOPS TEACHER",
        lesson: "LOOPS\nRepeat actions easily.\nPress E to take the challenge!",
        challenge: "Write a for loop that runs exactly 5 times.\n\nUse range() to control how many times it loops.",
        hint: "Type:  for i in range(5):",
        solutions: ["for i in range(5):", "for i in range( 5 ):"],
        ability: "Loop",
    },
];

// ── NPC BUILDER ───────────────────────────────────────────────────────────────
// Creates one NPC character mesh and places it in the scene
// dataIndex matches into NPC_DATA above
export function makeNPC(x, z, bodyColor, hatColor, dataIndex) {
    const data     = NPC_DATA[dataIndex];
    const g        = new THREE.Group();
    g.position.set(x, 0, z);

    const bodyMat  = new THREE.MeshLambertMaterial({ color: bodyColor });
    const hatMat   = new THREE.MeshLambertMaterial({ color: hatColor });
    const skinMat  = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const eyeMat   = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const pantsMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(bodyColor).offsetHSL(0, 0, -0.2)
    });

    // Body
    addTo(g, box(0.8, 1.0, 0.4, bodyMat), 0, 1.5, 0);

    // Head + eyes
    const head = box(0.8, 0.8, 0.8, skinMat);
    addTo(g, head, 0, 2.4, 0);
    addTo(head, box(0.15, 0.12, 0.05, eyeMat), -0.2, 0.05, 0.42);
    addTo(head, box(0.15, 0.12, 0.05, eyeMat),  0.2, 0.05, 0.42);

    // Arms
    addTo(g, box(0.3, 0.9, 0.3, bodyMat), -0.55, 1.55, 0);
    addTo(g, box(0.3, 0.9, 0.3, bodyMat),  0.55, 1.55, 0);

    // Pants/legs
    addTo(g, box(0.35, 0.9, 0.35, pantsMat), -0.22, 0.55, 0);
    addTo(g, box(0.35, 0.9, 0.35, pantsMat),  0.22, 0.55, 0);

    // Hat — brim + top
    addTo(head, box(1.1, 0.12, 1.1, hatMat), 0, 0.46, 0);
    addTo(head, box(0.7, 0.55, 0.7, hatMat), 0, 0.75, 0);

    // Glowing nameplate above head
    const nameMat = new THREE.MeshLambertMaterial({
        color: hatColor,
        emissive: new THREE.Color(hatColor),
        emissiveIntensity: 0.3
    });
    addTo(g, box(1.4, 0.4, 0.05, nameMat), 0, 3.6, 0);

    // Coloured point light — pulses in the game loop
    const npcLight = new THREE.PointLight(new THREE.Color(hatColor), 0.8, 6);
    npcLight.position.set(0, 2, 0);
    g.add(npcLight);

    // Store challenge data + light reference on the group
    // terminal.js reads this when the player opens a challenge
    g.userData = { ...data, light: npcLight };

    scene.add(g);
    addCollider(x, z, 1.2);
    return g;
}

// ── PLACE TEACHERS ────────────────────────────────────────────────────────────
// 6 teachers arranged around the central plaza
export const npcs = [
    makeNPC(-12,  0,  0xe74c3c, 0xc0392b, 0), // Variables  — red
    makeNPC( 12,  0,  0xf39c12, 0xe67e22, 1), // Constants  — orange
    makeNPC(  0, -12, 0x9b59b6, 0x8e44ad, 2), // Print      — purple
    makeNPC(-12, 12,  0x1abc9c, 0x16a085, 3), // Input      — teal
    makeNPC( 12, 12,  0xe67e22, 0xd35400, 4), // Logic      — dark orange
    makeNPC(  0, 12,  0x3498db, 0x2980b9, 5), // Loops      — blue
];
