class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    normalize() {
        let mag = this.magnitude();
        if (mag == 0) { return }
        this.x /= mag;
        this.y /= mag;
    }
    scaleToMag(mag) {
        this.normalize();
        this.x *= mag;
        this.y *= mag;
    }
}

class Entity {
    constructor() {
        this.type;
        this.hit = false;
        this.speed;
        this.radius;
        this.position;
        this.velocity;
    }
    calculatePosition(dt) {
        this.position.x += this.velocity.x * dt;
        if (this.position.x > canvas.width + this.radius) {
            this.position.x = 0 - this.radius;
        } else if (this.position.x < 0 - this.radius) {
            this.position.x = canvas.width + this.radius;
        }
        this.position.y += this.velocity.y * dt;
        if (this.position.y > canvas.height + this.radius) {
            this.position.y = 0 - this.radius;
        } else if (this.position.y < 0 - this.radius) {
            this.position.y = canvas.height + this.radius;
        }
    }
    deleteThis() {
        for (let i = 0; i < entities.length; i++) {
            if (entities[i] === this) {
                entities.splice(i, 1);
                delete this;
            }
        }
    }
    destroy() {
        if (this.hit) { return; }
        delete_stack.push(this);
        this.hit = true;
    }
    processCollision(other) {
        let ship, bullet, asteroid, alien;
        if (this.type === "Ship" && !this.respawning) { ship = this }
        if (this.type === "Bullet") { bullet = this }
        if (this.type === "Asteroid") { asteroid = this }
        if (this.type === "Alien") { alien = this }
        if (other.type === "Ship" && !other.respawning) { ship = other }
        if (other.type === "Bullet") { bullet = other }
        if (other.type === "Asteroid") { asteroid = other }
        if (other.type === "Alien") { alien = other }
        if (ship && asteroid) {
            ship.destroy();
            asteroid.addScore();
            asteroid.destroy();
        }
        if (bullet && asteroid) {
            bullet.destroy();
            if (bullet.player) {
                asteroid.addScore();
            }
            asteroid.destroy();
        }
        if (alien && asteroid) {
            alien.destroy();
            asteroid.destroy();
        }
        if (alien && ship) {
            alien.addScore();
            alien.destroy();
            ship.destroy();
        }
        if (bullet && ship) {
            if (!bullet.player) {
                bullet.destroy();
                ship.destroy();
            }
        }
        if (bullet && alien) {
            if (bullet.player) {
                bullet.destroy();
                alien.addScore();
                alien.destroy();
            }
        }
    }
    testCollision(other) {
        let distance = new Vector2(this.position.x - other.position.x, this.position.y - other.position.y);
        if (distance.magnitude() < this.radius + other.radius && !(this.type === other.type)) {
            this.processCollision(other);
        }
    }
    update(dt) {
    }
}

class Asteroid extends Entity {
    constructor(x, y, angle, size = 3) {
        super();
        this.type = "Asteroid";
        this.size = size;
        this.max_speed;
        this.min_speed = 30;
        if (size == 3) {
            this.max_speed = 50;
            this.radius = 20 * 2.4;
        } else if (size == 2) {
            this.max_speed = 100;
            this.radius = 20 * 1.2;
        } else {
            this.max_speed = 200;
            this.radius = 20 * 0.6;
        }
        this.speed = Math.random() * (this.max_speed - this.min_speed) + this.min_speed;
        this.angle = angle;
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(Math.cos(angle), Math.sin(angle));
        this.velocity.scaleToMag(this.speed);
    }
    addScore() {
        if (this.hit) { return; }
        switch (this.size) {
            case 1:
                score += 100;
                break;
            case 2:
                score += 50;
                break;
            case 3:
                score += 20;
                break;
        }
    }
    destroy() {
        if (this.hit) { return; }
        delete_stack.push(this);
        num_asteroids--;
        if (this.size > 1) {
            let offset = Math.random() * Math.PI / 3 - Math.PI / 6;
            entities.push(new Asteroid(this.position.x, this.position.y, this.angle + offset, this.size - 1));
            offset = Math.random() * Math.PI / 3 - Math.PI / 6;
            entities.push(new Asteroid(this.position.x, this.position.y, this.angle + offset, this.size - 1));
            num_asteroids += 2;
        }
        this.hit = true;
    }
    update(dt) {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
        this.calculatePosition(dt);
    }
}

class Bullet extends Entity {
    constructor(x, y, angle, player = true, max_lifetime = 1000) {
        super();
        this.type = "Bullet";
        this.player = player;
        this.speed = 500;
        this.radius = 4;
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(Math.cos(angle), Math.sin(angle));
        this.velocity.scaleToMag(this.speed);
        this.start_time = new Date().getTime();
        this.max_lifetime = max_lifetime;
    }
    checkLifeTime() {
        if (new Date().getTime() - this.start_time > this.max_lifetime) {
            this.destroy();
        }
    }
    destroy() {
        if (this.hit) { return; }
        delete_stack.push(this);
        this.hit = true;
    }
    update(dt) {
        this.checkLifeTime();
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
        this.calculatePosition(dt);
    }
}

class Alien extends Entity {
    constructor() {
        super();
        this.type = "Alien";
        alien_alive = true;
        this.big = ~~(Math.random() * 3);
        this.radius = this.big == 0 ? 10 : 20;
        this.bullet_max_lifetime = this.big == 0 ? 500 : 1000;
        this.speed = 100;
        this.move_state = true;
        this.side = ~~(Math.random() * 2);
        this.height = Math.random() * (canvas.height - 100) + 50;
        if (this.side == 0) {
            this.position = new Vector2(0 - this.radius, this.height);
            this.velocity = new Vector2(this.speed, 0);
        } else {
            this.position = new Vector2(canvas.width + this.radius, this.height);
            this.velocity = new Vector2(-this.speed, 0);
        }
        this.shot_timer = new Date().getTime();
        this.shot_cooldown = 1700;
    }
    calculatePosition(dt) {
        this.position.x += this.velocity.x * dt;
        if (this.position.x > canvas.width + this.radius || this.position.x < 0 - this.radius) {
            this.destroy();
        }
        this.position.y += this.velocity.y * dt;
        if (this.position.y > canvas.height + this.radius) {
            this.position.y = 0 - this.radius;
        } else if (this.position.y < 0 - this.radius) {
            this.position.y = canvas.height + this.radius;
        }
    }
    tryMovement() {
        if (Math.random() * 200 < 1) {
            if (this.move_state) {
                this.velocity.y = (~~(Math.random() * 2) - 0.5) * 2 * this.speed;
                this.velocity.scaleToMag(this.speed);
                this.move_state = false;
            } else {
                this.velocity.y = 0;
                this.velocity.scaleToMag(this.speed);
                this.move_state = true;
            }
        }
    }
    addScore() {
        if (this.big) {
            score += 200;
        } else {
            score += 1000;
        }
    }
    destroy() {
        if (this.hit) { return; }
        alien_alive = false;
        this.hit = true;
        delete_stack.push(this);
    }
    shoot() {
        let cur_time = new Date().getTime();
        if (cur_time - this.shot_timer > this.shot_cooldown) {
            let bullet;
            if (this.big) {
                bullet = new Bullet(this.position.x, this.position.y, Math.random() * 2 * Math.PI, false, this.bullet_max_lifetime);
            } else {
                let displacement = new Vector2(player.position.x - this.position.x, player.position.y - this.position.y);
                let angle = Math.atan(displacement.y / displacement.x);
                if (displacement.x < 0) {
                    angle += Math.PI;
                }
                bullet = new Bullet(this.position.x, this.position.y, angle, false, this.bullet_max_lifetime);
            }
            entities.push(bullet);
            this.shot_timer = cur_time;
        }
    }
    update(dt) {
        this.shoot();
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        this.tryMovement();
        this.calculatePosition(dt);
    }
}

class Ship extends Entity {
    constructor(x, y) {
        super();
        this.type = "Ship";
        this.lives = 3;
        this.acceleration_speed = 550;
        this.deceleration_scalar = 0.15;
        this.rotation_speed = 0.04;
        this.max_speed = 250;
        this.angle = 3 * Math.PI / 2;
        this.radius = 20;
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.shot_timer = new Date().getTime();
        this.shot_cooldown = 250;
        this.respawning = false;
        this.respawn_time = 1000;
        this.respawn_timer = new Date().getTime();
    }
    calculateVelocity(dt) {
        this.acceleration.x = 0;
        this.acceleration.y = 0;
        if (keys_down[0]) { this.angle -= this.rotation_speed }
        if (keys_down[1]) { this.angle += this.rotation_speed }
        if (keys_down[2]) {
            this.acceleration.x += Math.cos(this.angle);
            this.acceleration.y += Math.sin(this.angle);
            this.acceleration.scaleToMag(this.acceleration_speed * dt);
            this.velocity.x += this.acceleration.x;
            this.velocity.y += this.acceleration.y;
            if (this.velocity.magnitude() > this.max_speed) {
                this.velocity.scaleToMag(this.max_speed);
            }
        } else {
            this.acceleration.x = this.velocity.x;
            this.acceleration.y = this.velocity.y;
            this.acceleration.scaleToMag(this.acceleration_speed * dt);
            if (this.velocity.x > 0) {
                this.velocity.x = Math.max(0, this.velocity.x - this.acceleration.x * this.deceleration_scalar);
            } else {
                this.velocity.x = Math.min(0, this.velocity.x - this.acceleration.x * this.deceleration_scalar);
            }
            if (this.velocity.y > 0) {
                this.velocity.y = Math.max(0, this.velocity.y - this.acceleration.y * this.deceleration_scalar);
            } else {
                this.velocity.y = Math.min(0, this.velocity.y - this.acceleration.y * this.deceleration_scalar);
            }
        }
    }
    respawn() {
        if (this.lives == 0) { return; }
        if (new Date().getTime() - this.respawn_timer > this.respawn_time) {
            this.position.x = canvas.width / 2;
            this.position.y = canvas.height / 2;
            this.velocity.x = this.velocity.y = 0;
            this.hit = false;
            this.respawning = false;
        }
    }
    destroy() {
        if (this.hit) { return; }
        this.lives--;
        this.respawning = true;
        this.respawn_timer = new Date().getTime();
        this.hit = true;
    }
    shoot() {
        let cur_time = new Date().getTime();
        if (keys_down[3] && cur_time - this.shot_timer > this.shot_cooldown) {
            entities.push(new Bullet(this.position.x, this.position.y, this.angle));
            this.shot_timer = cur_time;
        }
    }
    update(dt) {
        if (this.respawning) {
            this.respawn();
            return;
        }
        this.shoot();
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, this.angle + 0.3, this.angle + 2 * Math.PI - 0.3);
        ctx.stroke();
        this.calculateVelocity(dt);
        this.calculatePosition(dt);
    }
}

let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");
let size = 800;
canvas.width = size;
canvas.height = size * 5 / 6;
document.body.appendChild(canvas);

let clock = new Date();
let t = clock.getTime();
let dt = 0;

let keys_down = [false, false, false, false];
let entities = [];
let num_asteroids = 0;
let alien_alive = false;
let alien_probability = 1500;
let level = 1;
let level_clock = 0;
let level_wait_time = 2000;
let level_done = true;
let delete_stack = [];
let player = new Ship(canvas.width / 2, canvas.height / 2);
entities.push(player);

let score = 0;
ctx.font = "30px Courier";
ctx.fillStyle = "white";
ctx.strokeStyle = "white";

document.addEventListener('keydown', function (event) {
    if (event.key == 'a') {
        keys_down[0] = true;
    }
    else if (event.keyCode == 37) {
        keys_down[0] = true;
    }
    else if (event.key == 'd') {
        keys_down[1] = true;
    }
    else if (event.keyCode == 39) {
        keys_down[1] = true;
    }
    else if (event.key == 'w') {
        keys_down[2] = true;
    }
    else if (event.keyCode == 38) {
        keys_down[2] = true;
    }
    else if (event.key == ' ') {
        keys_down[3] = true;
    }
});

document.addEventListener('keyup', function (event) {
    if (event.key == 'a') {
        keys_down[0] = false;
    }
    else if (event.keyCode == 37) {
        keys_down[0] = false;
    }
    else if (event.key == 'd') {
        keys_down[1] = false;
    }
    else if (event.keyCode == 39) {
        keys_down[1] = false;
    }
    else if (event.key == 'w') {
        keys_down[2] = false;
    }
    else if (event.keyCode == 38) {
        keys_down[2] = false;
    }
    else if (event.key == ' ') {
        keys_down[3] = false;
    }
});

function drawLife(life) {
    let x = 60, y = 48;
    let w = 20, h = 30;
    let d = 8;
    ctx.beginPath();
    ctx.rect(x + life * (w + d), y, w, h);
    ctx.stroke();
}

function drawStats() {
    ctx.fillText(score, 50, 35);
    for (let i = 0; i < player.lives; i++) {
        drawLife(i)
    }
}

function drawGameOver() {
    if (player.lives == 0) {
        ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
    }
}

function startLevel(level) {
    let n = level + 3;
    level_done = false;
    for (let i = 0; i < n; i++) {
        let x = (Math.random() * canvas.width / 2 + player.position.x + canvas.width / 4) % canvas.width;
        let y = (Math.random() * canvas.height / 2 + player.position.y + canvas.height / 4) % canvas.height;
        let angle = Math.random() * 2 * Math.PI;
        entities.push(new Asteroid(x, y, angle));
    }
    num_asteroids += n;
}

function updateEntities(dt) {
    for (let i = 0; i < entities.length; i++) {
        entities[i].update(dt);
    }
    for (let i = 0; i < entities.length; i++) {
        let entity1 = entities[i];
        for (let j = 0; j < i; j++) {
            let entity2 = entities[j];
            entity1.testCollision(entity2);
        }
    }
}

function spawnAlien() {
    if (num_asteroids > 0 && !alien_alive && Math.random() * alien_probability < 1) {
        entities.push(new Alien());
        alien_alive = true;
    }
}

function emptyDeleteStack() {
    while (delete_stack.length > 0) {
        delete_stack.pop().deleteThis();
    }
}

function processNewLevel() {
    if (num_asteroids == 0 && !alien_alive) {
        let cur_t = new Date().getTime();
        if (level_done) {
            if (cur_t - level_clock > level_wait_time) {
                startLevel(level);
                level++;
            }
        } else {
            level_done = true;
            level_clock = cur_t;
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStats();
    drawGameOver();
    updateEntities(dt);
    spawnAlien();
    emptyDeleteStack();
    processNewLevel();
    clock = new Date();
    let new_t = clock.getTime();
    dt = (new_t - t) / 1000;
    t = new_t;
    setTimeout(gameLoop, 1);
}

gameLoop();
