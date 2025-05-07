class mainGame extends Phaser.Scene {
    constructor() {
        super("mainGame");
        this.my = { sprite: {}, wave: []};
        this.playerSpeed = 2.5;
        this.bulletSpeed = 8;
        this.bulletActive = false;
        this.waveSpawned = false;
        this.eMovement = false;
        this.enemyScore = 25;
        this.score = 0;
        this.waveSpawnPending = false;
        this.gameOver = false;
        this.lives = 3;
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.image("playerPlane", "ship_0009.png");
        this.load.image("playerBullet", "tile_0012.png");
        this.load.image("enemySimple", "ship_0013.png");
        this.load.image("eSimpleBullet", "tile_0014.png");
        this.load.image("enemyBig", "ship_0014.png");
        this.load.image("eBigBullet", "tile_0015.png");
        this.load.image("background", "https://static.vecteezy.com/system/resources/previews/042/818/355/non_2x/8bit-pixel-graphic-blue-sky-background-with-clouds-vector.jpg");
        this.load.audio("playerShoot", "footstep_snow_002.ogg");
        this.load.audio("enemyShoot", "footstep_snow_002.ogg");
    }

    create() {
        let my = this.my;

        this.add.image(400, 300, "background");

        this.gameOver = false;
        this.score = 0;
        this.lives = 3;
        this.bulletActive = false;
        this.waveSpawned = false;
        this.waveSpawnPending = false;
        my.wave = [];
        my.eBullets = [];

        my.sprite.player = this.add.sprite(400, 550, "playerPlane").setScale(2);
        my.sprite.pBullet = this.add.sprite(-10, -10, "playerBullet");
        my.sprite.pBullet.visible = false;

        this.cursors = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            shoot: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        this.scoreText = this.add.text(780, 20, "SCORE: 0", {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#ffffff',
            align: 'right'
        }).setOrigin(1, 0);

        this.livesText = this.add.text(20, 20, "LIVES: 3", {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#ffffff'
        });

        this.gameOverText = this.add.text(400, 250, "", {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            color: '#ff0000',
            align: 'center'
        }).setOrigin(0.5).setVisible(false);

        this.restartButton = this.add.text(400, 350, "RESTART", {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setVisible(false).setInteractive();

        this.restartButton.on("pointerdown", () => {
            this.scene.restart();
        });
    }

    update() {
        if (this.gameOver)
        {
            return;
        }

        let my = this.my;

        if (this.cursors.left.isDown) my.sprite.player.x -= this.playerSpeed;
        if (this.cursors.right.isDown) my.sprite.player.x += this.playerSpeed;

        if (Phaser.Input.Keyboard.JustDown(this.cursors.shoot) && !this.bulletActive) {
            this.bulletActive = true;
            my.sprite.pBullet.x = my.sprite.player.x;
            my.sprite.pBullet.y = my.sprite.player.y - my.sprite.player.displayHeight/2;
            my.sprite.pBullet.visible = true;

            this.sound.play("playerShoot", {
                volume: 0.1
            });
        }

        if (this.bulletActive) {
            my.sprite.pBullet.y -= this.bulletSpeed;
            if (my.sprite.pBullet.y < -my.sprite.pBullet.height/2) {
                this.bulletActive = false;
                my.sprite.pBullet.visible = false;
            }
        }

        this.enemyMovement();

        for (let i = 0; i < my.wave.length; i++) {
            let enemy = my.wave[i].sprite;
            if (this.collides(enemy, my.sprite.pBullet)) {
                my.sprite.pBullet.x = -100;
                this.bulletActive = false;
                my.sprite.pBullet.visible = false;

                this.score += my.wave[i].scoreValue;
                this.scoreText.setText("SCORE: " + this.score);

                enemy.destroy();
                my.wave.splice(i, 1);
                break;
            }
        }

        for (let i = 0; i < my.eBullets.length; i++) {
            let bullet = my.eBullets[i];
            bullet.y += bullet.getData("speed");

            if (bullet.y > 600) {
                bullet.destroy();
                my.eBullets.splice(i, 1);
                i--;
                continue;
            }

            if (this.collides(bullet, my.sprite.player)) {
                bullet.destroy();
                my.eBullets.splice(i, 1);
                this.lives--;

                this.livesText.setText("LIVES: " + this.lives);

                if (this.lives <= 0) {
                    this.handleGameOver();
                }

                break;
            }
        }

        if (my.wave.length === 0 && !this.waveSpawnPending) {
            this.waveSpawnPending = true;
            this.time.delayedCall(2000, () => {
                this.createWave();
                this.waveSpawned = true;
                this.waveSpawnPending = false;
            });
        }
    }

    createWave() {
        let my = this.my;
        let now = this.time.now;

        let positions = [
            { x: 400, y: -15 },
            { x: 350, y: -30 },
            { x: 450, y: -30 },
            { x: 300, y: -45 },
            { x: 500, y: -45 }
        ];

        for (let i = 0; i < positions.length; i++) {
            let pos = positions[i];
            let spriteKey = (i === 0) ? "enemyBig" : "enemySimple";
            let bulletKey = (i === 0) ? "eBigBullet" : "eSimpleBullet";

            let sprite = this.add.sprite(pos.x, pos.y, spriteKey);
            if (i === 0) sprite.setScale(1.5);

            my.wave.push({
                sprite: sprite,
                activatedAt: now,
                followingPath: false,
                startedPath: false,
                t: 0,
                direction: (pos.x < 400) ? 1 : -1,
                x0: pos.x,
                y0: 100,
                lastFiredAt: now,
                bulletKey: bulletKey,
                scoreValue: (i === 0) ? 100 : this.enemyScore
            });
        }
    }

    enemyMovement() {
        let my = this.my;
        let currentTime = this.time.now;

        if (!this.waveSpawned) {
            this.createWave();
            this.waveSpawned = true;
            return;
        }

        let allInPosition = true;
        for (let i = 0; i < my.wave.length; i++) {
            let enemyData = my.wave[i];
            let enemy = enemyData.sprite;

            if (enemy.y < enemyData.y0) {
                enemy.y += 1;
                allInPosition = false;
            }
        }

        if (allInPosition) {
            for (let i = 0; i < my.wave.length; i++) {
                let enemyData = my.wave[i];
                let enemy = enemyData.sprite;

                if (!enemyData.startedPath && currentTime - enemyData.activatedAt >= 5000 + (i * 1000)) {
                    enemyData.startedPath = true;
                }

                if (enemyData.startedPath) {
                    enemyData.t += 0.1;
                    enemy.x = enemyData.x0 + enemyData.direction * Math.pow(enemyData.t, 2);
                    enemy.y = enemyData.y0 + enemyData.t * 10;

                    if (currentTime - enemyData.lastFiredAt >= 1000) {
                        enemyData.lastFiredAt = currentTime;
                        let bullet = this.add.sprite(enemy.x, enemy.y + enemy.displayHeight / 2, enemyData.bulletKey);
                        bullet.setData("speed", 2);
                        my.eBullets.push(bullet);

                        this.sound.play("playerShoot", {
                            volume: 0.1
                        });
                    }

                    if (enemy.y > 650 || enemy.x < -50 || enemy.x > 850) {
                        enemy.destroy();
                        my.wave.splice(i, 1);
                        i--;
                    }
                }
            }
        }
    }

    handleGameOver() {
        this.gameOver = true;

        this.gameOverText.setText("GAME OVER\nSCORE: " + this.score);
        this.gameOverText.setVisible(true);

        this.restartButton.setVisible(true);
    }

    collides(a, b) {
        if (Math.abs(a.x - b.x) > (a.displayWidth/2 + b.displayWidth/2)) return false;
        if (Math.abs(a.y - b.y) > (a.displayHeight/2 + b.displayHeight/2)) return false;
        return true;
    }
}
