// Mission Control - Pixel Office UI
// Agent visualization and management system

// Agent Configuration
const AGENTS = {
    CEO: { name: 'CEO Agent', role: 'Executive', avatar: '👔', color: '#f59e0b' },
    Owen: { name: 'Owen', role: 'Lead Hunter', avatar: '🎯', color: '#22c55e' },
    Bob: { name: 'Bob', role: ' Auditor', avatar: '🔍', color: '#00d4ff' }
};

// Office Layout
const DESKS = [
    { id: 1, x: 100, y: 150, name: 'Desk 1' },
    { id: 2, x: 250, y: 150, name: 'Desk 2' },
    { id: 3, x: 400, y: 150, name: 'Desk 3' },
    { id: 4, x: 100, y: 350, name: 'Desk 4' },
    { id: 5, x: 250, y: 350, name: 'Desk 5' },
    { id: 6, x: 400, y: 350, name: 'Desk 6' }
];

// State
let state = {
    spawnedAgents: {},
    selectedAgent: null,
    assignMode: false,
    canvasOffset: { x: 0, y: 0 },
    lastUpdate: Date.now()
};

// Canvas Setup
const canvas = document.getElementById('office-canvas');
const ctx = canvas.getContext('2d');
let animationFrame = 0;

// Initialize
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setupEventListeners();
    spawnAgent('CEO');
    spawnAgent('Owen');
    spawnAgent('Bob');
    gameLoop();
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

// Event Listeners
function setupEventListeners() {
    // Spawn button
    document.getElementById('spawn-btn').addEventListener('click', () => {
        showMessage('Select an agent from the roster to spawn');
    });

    // Roster clicks
    document.querySelectorAll('.roster-item').forEach(item => {
        item.addEventListener('click', () => {
            const agentId = item.dataset.agent;
            if (state.spawnedAgents[agentId]) {
                selectAgent(agentId);
            } else {
                spawnAgent(agentId);
            }
        });
    });

    // Kill agent button
    document.getElementById('kill-agent-btn').addEventListener('click', () => {
        if (state.selectedAgent) {
            killAgent(state.selectedAgent);
        }
    });

    // Assign button
    document.getElementById('assign-btn').addEventListener('click', () => {
        if (state.selectedAgent) {
            showDeskModal();
        }
    });

    // Desk modal
    document.getElementById('cancel-desk-btn').addEventListener('click', hideDeskModal);
    document.querySelectorAll('.desk-option').forEach(opt => {
        opt.addEventListener('click', () => {
            if (!opt.classList.contains('occupied')) {
                assignToDesk(state.selectedAgent, parseInt(opt.dataset.desk));
                hideDeskModal();
            }
        });
    });

    // Message modal
    document.getElementById('cancel-msg-btn').addEventListener('click', hideMessageModal);
    document.getElementById('send-msg-btn').addEventListener('click', sendMessage);
}

// Agent Management
function spawnAgent(agentId) {
    if (state.spawnedAgents[agentId]) {
        log(`${AGENTS[agentId].name} already active`, 'error');
        return;
    }

    state.spawnedAgents[agentId] = {
        ...AGENTS[agentId],
        id: agentId,
        status: 'idle',
        activity: 'waiting',
        desk: null,
        x: 50 + Math.random() * 100,
        y: 500,
        targetX: 50 + Math.random() * 100,
        targetY: 500,
        animFrame: 0,
        message: null,
        messageTimer: 0
    };

    updateRoster();
    updateStats();
    log(`Spawned ${AGENTS[agentId].name}`, 'success');

    // Auto-assign to available desk
    const availableDesk = DESKS.find(d => !Object.values(state.spawnedAgents).some(a => a.desk === d.id));
    if (availableDesk) {
        setTimeout(() => {
            assignToDesk(agentId, availableDesk.id);
        }, 500);
    }
}

function killAgent(agentId) {
    if (!state.spawnedAgents[agentId]) return;

    const agent = state.spawnedAgents[agentId];
    delete state.spawnedAgents[agentId];

    if (state.selectedAgent === agentId) {
        state.selectedAgent = null;
        document.getElementById('selected-agent-panel').style.display = 'none';
    }

    updateRoster();
    updateStats();
    log(`Terminated ${agent.name}`, 'error');
    hideSpeechBubbles(agentId);
}

function selectAgent(agentId) {
    state.selectedAgent = agentId;
    updateRoster();

    const agent = state.spawnedAgents[agentId];
    const panel = document.getElementById('selected-agent-panel');
    panel.style.display = 'block';

    document.getElementById('detail-name').textContent = agent.name;
    document.getElementById('detail-role').textContent = agent.role;
    document.getElementById('detail-status').textContent = agent.status;
    document.getElementById('detail-activity').textContent = agent.activity;
}

function assignToDesk(agentId, deskId) {
    const agent = state.spawnedAgents[agentId];
    if (!agent) return;

    const desk = DESKS.find(d => d.id === deskId);
    if (!desk) return;

    agent.desk = deskId;
    agent.targetX = desk.x;
    agent.targetY = desk.y;

    log(`${agent.name} assigned to ${desk.name}`, 'success');
    updateStats();
}

function updateAgentActivity(agentId, activity) {
    const agent = state.spawnedAgents[agentId];
    if (!agent) return;

    agent.activity = activity;

    // Show speech bubble for waiting
    if (activity === 'waiting' && !agent.message) {
        showSpeechBubble(agentId, '💭 Waiting...');
    } else if (activity !== 'waiting') {
        hideSpeechBubbles(agentId);
    }
}

// UI Updates
function updateRoster() {
    document.querySelectorAll('.roster-item').forEach(item => {
        const agentId = item.dataset.agent;
        const agent = state.spawnedAgents[agentId];
        const statusBadge = item.querySelector('.status-badge');

        if (agent) {
            item.classList.add('spawned');
            statusBadge.className = 'status-badge active';
            statusBadge.textContent = agent.activity;
        } else {
            item.classList.remove('spawned', 'selected');
            statusBadge.className = 'status-badge idle';
            statusBadge.textContent = AGENTS[agentId].role;
        }

        if (state.selectedAgent === agentId) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function updateStats() {
    const total = Object.keys(state.spawnedAgents).length;
    const active = Object.values(state.spawnedAgents).filter(a => a.status === 'active').length;

    document.getElementById('agent-count').textContent = total;
    document.getElementById('active-count').textContent = active;
}

function log(message, type = 'info') {
    const container = document.getElementById('logs-container');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    container.insertBefore(entry, container.firstChild);

    // Keep only last 50 entries
    while (container.children.length > 50) {
        container.removeChild(container.lastChild);
    }
}

// Desk Modal
function showDeskModal() {
    const modal = document.getElementById('desk-modal');
    const grid = document.getElementById('desk-grid');
    grid.innerHTML = '';

    DESKS.forEach(desk => {
        const occupied = Object.values(state.spawnedAgents).some(a => a.desk === desk.id);
        const div = document.createElement('div');
        div.className = `desk-option${occupied ? ' occupied' : ''}`;
        div.dataset.desk = desk.id;
        div.innerHTML = `<div>${desk.name}</div>${occupied ? '<small>Occupied</small>' : '<small>Available</small>'}`;
        grid.appendChild(div);
    });

    modal.style.display = 'flex';
}

function hideDeskModal() {
    document.getElementById('desk-modal').style.display = 'none';
}

// Message Modal
function showMessageModal(agentId) {
    const modal = document.getElementById('message-modal');
    const agent = state.spawnedAgents[agentId];
    document.getElementById('message-agent-name').textContent = agent.name;
    document.getElementById('message-input').value = '';
    modal.style.display = 'flex';
}

function hideMessageModal() {
    document.getElementById('message-modal').style.display = 'none';
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (message && state.selectedAgent) {
        showSpeechBubble(state.selectedAgent, message);
        log(`Message to ${state.spawnedAgents[state.selectedAgent].name}: "${message}"`, 'agent');
        input.value = '';
        hideMessageModal();
    }
}

function showMessage(text) {
    log(text, 'warning');
}

// Speech Bubbles
function showSpeechBubble(agentId, text) {
    const agent = state.spawnedAgents[agentId];
    if (!agent) return;

    agent.message = text;
    agent.messageTimer = 180; // 3 seconds at 60fps
}

function hideSpeechBubbles(agentId) {
    const agent = state.spawnedAgents[agentId];
    if (agent) {
        agent.message = null;
        agent.messageTimer = 0;
    }
}

// Game Loop
function gameLoop() {
    update();
    render();
    animationFrame++;
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update agent positions
    Object.values(state.spawnedAgents).forEach(agent => {
        // Smooth movement
        const dx = agent.targetX - agent.x;
        const dy = agent.targetY - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 2) {
            agent.x += dx * 0.1;
            agent.y += dy * 0.1;
            agent.status = 'walking';
        } else {
            agent.x = agent.targetX;
            agent.y = agent.targetY;
            agent.status = agent.activity === 'working' ? 'active' : 'idle';
        }

        // Animation frame
        if (agent.status === 'walking') {
            agent.animFrame = (animationFrame / 10) % 4;
        } else if (agent.status === 'active') {
            agent.animFrame = (animationFrame / 5) % 2;
        } else {
            agent.animFrame = 0;
        }

        // Message timer
        if (agent.messageTimer > 0) {
            agent.messageTimer--;
            if (agent.messageTimer === 0) {
                agent.message = null;
            }
        }
    });

    // Update selected agent panel
    if (state.selectedAgent) {
        const agent = state.spawnedAgents[state.selectedAgent];
        if (agent) {
            document.getElementById('detail-status').textContent = agent.status;
            document.getElementById('detail-activity').textContent = agent.activity;
        }
    }
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw floor grid
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw office elements
    drawOffice();

    // Draw desks
    DESKS.forEach(desk => {
        drawDesk(desk);
    });

    // Draw agents
    Object.values(state.spawnedAgents).forEach(agent => {
        drawAgent(agent);
    });

    // Draw speech bubbles
    Object.values(state.spawnedAgents).forEach(agent => {
        if (agent.message) {
            drawSpeechBubble(agent);
        }
    });
}

function drawOffice() {
    // Draw some office furniture as background elements

    // Plant
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(50, 50, 30, 30);
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(65, 40, 20, 0, Math.PI * 2);
    ctx.fill();

    // Bookshelf
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(650, 80, 100, 120);
    ctx.fillStyle = '#6d28d9';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(655, 90 + i * 28, 90, 24);
    }

    // Coffee station
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(350, 480, 80, 50);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(360, 490, 60, 30);
}

function drawDesk(desk) {
    const agent = Object.values(state.spawnedAgents).find(a => a.desk === desk.id);

    // Desk shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(desk.x + 5, desk.y + 5, 100, 60);

    // Desk
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(desk.x, desk.y, 100, 60);

    // Desk border
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 2;
    ctx.strokeRect(desk.x, desk.y, 100, 60);

    // Monitor
    if (agent) {
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(desk.x + 20, desk.y - 10, 60, 45);
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(desk.x + 25, desk.y - 5, 50, 35);
    } else {
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(desk.x + 20, desk.y - 10, 60, 45);
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(desk.x + 25, desk.y - 5, 50, 35);
    }

    // Chair
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(desk.x + 35, desk.y + 60, 30, 20);

    // Desk label
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(desk.name, desk.x + 50, desk.y + 90);
}

function drawAgent(agent) {
    const isSelected = state.selectedAgent === agent.id;
    const isWalking = agent.status === 'walking';
    const bobOffset = isWalking ? Math.sin(animationFrame * 0.5) * 3 : 0;

    // Selection highlight
    if (isSelected) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(agent.x + 20, agent.y + 20 + bobOffset, 25, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(agent.x + 20, agent.y + 45, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (pixel art style rectangle)
    ctx.fillStyle = agent.color;
    ctx.fillRect(agent.x + 5, agent.y + 15 + bobOffset, 30, 30);

    // Head
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(agent.x + 10, agent.y + bobOffset, 20, 20);

    // Eyes
    ctx.fillStyle = '#000';
    if (isWalking) {
        ctx.fillRect(agent.x + 13, agent.y + 5 + bobOffset, 4, 4);
        ctx.fillRect(agent.x + 23, agent.y + 5 + bobOffset, 4, 4);
    } else {
        ctx.fillRect(agent.x + 13, agent.y + 7 + bobOffset, 4, 4);
        ctx.fillRect(agent.x + 23, agent.y + 7 + bobOffset, 4, 4);
    }

    // Avatar indicator
    ctx.font = '16px sans-serif';
    ctx.fillText(agent.avatar, agent.x + 12, agent.y + 12 + bobOffset);

    // Activity indicator
    const activityColors = {
        'typing': '#00d4ff',
        'reading': '#22c55e',
        'running': '#f59e0b',
        'waiting': '#ef4444',
        'walking': '#00d4ff'
    };

    if (agent.status !== 'idle') {
        ctx.fillStyle = activityColors[agent.activity] || activityColors[agent.status];
        ctx.beginPath();
        ctx.arc(agent.x + 40, agent.y + bobOffset, 6, 0, Math.PI * 2);
        ctx.fill();

        // Pulse ring
        ctx.strokeStyle = activityColors[agent.activity] || activityColors[agent.status];
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(agent.x + 40, agent.y + bobOffset, 8 + (animationFrame % 20), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Name tag
    ctx.fillStyle = isSelected ? '#f59e0b' : '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(agent.name, agent.x + 20, agent.y - 10);
}

function drawSpeechBubble(agent) {
    const text = agent.message;
    ctx.font = '12px sans-serif';
    const metrics = ctx.measureText(text);
    const width = Math.max(60, metrics.width + 20);
    const height = 30;

    const bubbleX = agent.x + 40 - width / 2;
    const bubbleY = agent.y - 50;

    // Bubble background
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, width, height, 8);
    ctx.fill();

    // Bubble tail
    ctx.beginPath();
    ctx.moveTo(agent.x + 40, agent.y - 20);
    ctx.lineTo(agent.x + 35, bubbleY + height);
    ctx.lineTo(agent.x + 45, bubbleY + height);
    ctx.closePath();
    ctx.fill();

    // Bubble text
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, agent.x + 40, bubbleY + 20);
}

// Simulate agent activity
function simulateActivity() {
    Object.keys(state.spawnedAgents).forEach(agentId => {
        const activities = ['typing', 'reading', 'running', 'waiting'];
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];

        if (Math.random() > 0.7) {
            updateAgentActivity(agentId, randomActivity);
            updateRoster();
        }
    });
}

// Start simulation
setInterval(simulateActivity, 3000);

// Initialize on load
window.addEventListener('load', init);

// Export for module usage
window.MissionControl = {
    spawnAgent,
    killAgent,
    selectAgent,
    assignToDesk,
    updateAgentActivity,
    log
};