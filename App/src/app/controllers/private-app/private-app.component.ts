import { HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from 'src/app/services/session.service';
import { UsersService } from 'src/app/services/users.service';

declare const WebSocketManager: any;

@Component({
  selector: 'app-private-app',
  templateUrl: './private-app.component.html',
  styleUrls: ['./private-app.component.css'],
})
export class PrivateAppComponent implements OnInit {
  user: any;
  connection: any;
  score: number;
  highScore: number;

  constructor(
    public session: SessionService,
    public users: UsersService,
    public router: Router
  ) {
    this.connection = new WebSocketManager.Connection(
      'ws://localhost:3030/server'
    );

    this.score = 0;
    this.highScore = 0;
  }

  ngOnInit(): void {
    this.session.me().subscribe((user) => {
      this.user = user;
      if (!this.user) {
        const options = this.session.expired
          ? { queryParams: { expired: true } }
          : undefined;
        this.router.navigate(['/login'], options).then(() => {
          window.location.reload();
        });
      } else {
        alert(
          'Welcome to the MultiSnake game!\nUse the arrow keys to move around. Have fun!'
        );

        this.game();
      }
    });
  }

  game() {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.user.token}`,
      }),
    };
    this.users.getUserById(this.user.id, httpOptions).subscribe(
      (user) => {
        this.highScore = user.highScore;
      },
      (error) => {
        console.log(error);
      }
    );

    const canvas: any = document.querySelector('.gameCanvas');
    const context: any = canvas.getContext('2d');

    const field: any = {
      gridSize: 15,
      gridMargin: 0,
      xTileCount: 40,
      yTileCount: 34,
    };

    const snakeXPos = Math.floor(Math.random() * field.xTileCount);
    const snakeYPos = Math.floor(Math.random() * field.yTileCount);
    let snake: Snake = new Snake(snakeXPos, snakeYPos);

    const numberOfApples = 3;
    let apples: Apple[] = [];

    // instantiate the apples
    const containsApple = (apple: Apple): boolean => {
      for (let i = 0; i < apples.length; i++)
        if (apple.xPos === apples[i].xPos && apple.yPos === apples[i].yPos)
          return true;
      return false;
    };
    for (let i = 0; i < numberOfApples; i++) {
      let appleXPos = Math.floor(Math.random() * field.xTileCount);
      let appleYPos = Math.floor(Math.random() * field.yTileCount);
      while (
        snake.contains(appleXPos, appleYPos) ||
        containsApple(new Apple(appleXPos, appleYPos))
      ) {
        appleXPos = Math.floor(Math.random() * field.xTileCount);
        appleYPos = Math.floor(Math.random() * field.yTileCount);
      }
      apples[i] = new Apple(appleXPos, appleYPos);
    }
    // let apple: Apple = new Apple(appleXPos, appleYPos, 1);

    let snakes: Snake[] = [];

    const startGame = () => {
      this.score = snake.score;

      snake.xPos += snake.xVel;
      snake.yPos += snake.yVel;

      if (snake.xPos < 0) snake.xPos = field.xTileCount - 1; // colision with left wall
      if (snake.xPos > field.xTileCount - 1) snake.xPos = 0; // colision with right wall
      if (snake.yPos < 0) snake.yPos = field.yTileCount - 1; // colision with up wall
      if (snake.yPos > field.yTileCount - 1) snake.yPos = 0; // colision with down wall

      // color the field
      context.fillStyle = '#424242';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // color the apples
      for (let i = 0; i < apples.length; i++) {
        if (apples[i].xPos === snake.xPos && apples[i].yPos === snake.yPos) {
          snake.eat(apples[i]);

          let appleXPos = Math.floor(Math.random() * field.xTileCount);
          let appleYPos = Math.floor(Math.random() * field.yTileCount);
          while (
            snake.contains(appleXPos, appleYPos) ||
            containsApple(new Apple(appleXPos, appleYPos))
          ) {
            appleXPos = Math.floor(Math.random() * field.xTileCount);
            appleYPos = Math.floor(Math.random() * field.yTileCount);
          }
          apples[i] = new Apple(appleXPos, appleYPos);
        }

        if (apples[i].points === 5) context.fillStyle = '#edb118';
        else context.fillStyle = '#e60b0b';
        context.fillRect(
          apples[i].xPos * field.gridSize,
          apples[i].yPos * field.gridSize,
          field.gridSize - field.gridMargin,
          field.gridSize - field.gridMargin
        );
      }

      // color the other snakes
      snakes.forEach((other) => {
        if (other.id != snake.id) {
          for (let i = 0; i < other.trail.length; i++) {
            context.fillStyle = '#ff871f';
            context.fillRect(
              other.trail[i].xPos * field.gridSize,
              other.trail[i].yPos * field.gridSize,
              field.gridSize - field.gridMargin,
              field.gridSize - field.gridMargin
            );

            // snake dies if its head colides with other snakes
            if (
              other.trail[i].xPos === snake.xPos &&
              other.trail[i].yPos === snake.yPos
            ) {
              if (snake.score > this.highScore) {
                this.users
                  .partialUpdateUser(
                    this.user.id,
                    [
                      {
                        op: 'replace',
                        path: 'highScore',
                        value: snake.score,
                      },
                    ],
                    httpOptions
                  )
                  .subscribe();
              }
              snake.die();
            }
          }
          context.fillStyle = '#b06019';
          context.fillRect(
            other.trail[other.trail.length - 1].xPos * field.gridSize,
            other.trail[other.trail.length - 1].yPos * field.gridSize,
            field.gridSize - field.gridMargin,
            field.gridSize - field.gridMargin
          );
        }
      });

      // color the apple
      /* context.fillStyle = '#e00d0d';
      context.fillRect(
        apple.xPos * field.gridSize,
        apple.yPos * field.gridSize,
        field.gridSize - field.gridMargin,
        field.gridSize - field.gridMargin
      ); */

      // color the  body
      context.fillStyle = '#759419';
      for (let i = 0; i < snake.trail.length; i++) {
        context.fillRect(
          snake.trail[i].xPos * field.gridSize,
          snake.trail[i].yPos * field.gridSize,
          field.gridSize - field.gridMargin,
          field.gridSize - field.gridMargin
        );

        // colision with own body
        if (
          snake.trail[i].xPos === snake.xPos &&
          snake.trail[i].yPos === snake.yPos
        ) {
          if (snake.score > this.highScore) {
            this.users
              .partialUpdateUser(
                this.user.id,
                [
                  {
                    op: 'replace',
                    path: 'highScore',
                    value: snake.score,
                  },
                ],
                httpOptions
              )
              .subscribe();
          }
          snake.die();
        }
      }
      snake.trail.push({ xPos: snake.xPos, yPos: snake.yPos });
      while (snake.trail.length > snake.tail) snake.trail.shift();

      // color the snake head
      context.fillStyle = '#4c6112';
      context.fillRect(
        snake.trail[snake.trail.length - 2].xPos * field.gridSize,
        snake.trail[snake.trail.length - 2].yPos * field.gridSize,
        field.gridSize - field.gridMargin,
        field.gridSize - field.gridMargin
      );

      // move to the other snakes
      if (this.connection.socket.readyState == 1) {
        this.connection.invoke('OnMove', JSON.stringify(snake));
      }

      /* if (apple.xPos === snake.xPos && apple.yPos === snake.yPos) {
        snake.eat(apple);

        appleXPos = Math.floor(Math.random() * field.xTileCount);
        appleYPos = Math.floor(Math.random() * field.yTileCount);
        while (snake.contains(appleXPos, appleYPos)) {
          appleXPos = Math.floor(Math.random() * field.xTileCount);
          appleYPos = Math.floor(Math.random() * field.yTileCount);
        }
        apple = new Apple(appleXPos, appleYPos, 1);
      } */
    };

    const keyPush = (event: any) => {
      event.preventDefault();
      switch (event.key) {
        case 'ArrowLeft':
          if (snake.xVel === 1 && snake.yVel === 0) break;
          snake.xVel = -1;
          snake.yVel = 0;
          break;
        case 'ArrowUp':
          if (snake.xVel === 0 && snake.yVel === 1) break;
          snake.xVel = 0;
          snake.yVel = -1;
          break;
        case 'ArrowRight':
          if (snake.xVel === -1 && snake.yVel === 0) break;
          snake.xVel = 1;
          snake.yVel = 0;
          break;
        case 'ArrowDown':
          if (snake.xVel === 0 && snake.yVel === -1) break;
          snake.xVel = 0;
          snake.yVel = 1;
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', keyPush);

    this.connection.connectionMethods.onConnected = () => {
      snake.setId(this.connection.connectionId);
      this.connection.invoke('ConnectedSnake', JSON.stringify(snake));
    };

    this.connection.connectionMethods.onDisconnected = () => {
      this.connection.invoke('DisconnectedSnake', JSON.stringify(snake));
    };

    this.connection.clientMethods['pingSnakes'] = (serializedSnakes: any) => {
      snakes = JSON.parse(serializedSnakes);
    };

    /* this.connection.clientMethods['pingApples'] = (serializedApples: any) => {
      console.log(serializedApples);
      apples = JSON.parse(serializedApples);
    };
    console.log(apples); */

    this.connection.start();

    window.onunload = () => {
      this.connection.invoke('DisconnectedSnake', JSON.stringify(snake));
    };

    if (!this.user)
      this.connection.invoke('DisconnectedSnake', JSON.stringify(snake));

    setInterval(startGame, 1000 / 10);
  }
}

class Apple {
  xPos: number;
  yPos: number;
  points: number;

  constructor(xPos: number, yPos: number) {
    this.xPos = xPos;
    this.yPos = yPos;

    const goldenApple = Math.floor(Math.random() * 10);
    this.points = goldenApple == 9 ? 5 : 1;
  }
}

class Snake {
  id: String;
  xPos: number;
  yPos: number;
  xVel: number;
  yVel: number;
  tail: number;
  trail: any[];
  score: number;

  constructor(xPos: number, yPos: number) {
    this.id = '';
    this.xPos = xPos;
    this.yPos = yPos;
    this.xVel = 1;
    this.yVel = 0;
    this.tail = 3;
    this.trail = [];
    this.score = 0;
    // starts with the snake all colored
    /* for (let i = this.tail - 1; i >= 0; i--) {
      this.trail.push({ xPos: this.xPos - i, yPos: this.yPos });
    } */
  }

  eat(apple: Apple) {
    this.tail += apple.points;
    this.score += apple.points;
  }

  die() {
    if (
      window.confirm(
        `Ups! You died! Your score was ${this.score} points.\nClick OK to restart the game.`
      )
    )
      location.reload();
    else location.reload();
  }

  setId(id: String) {
    this.id = id;
  }

  contains(xPos: number, yPos: number): boolean {
    for (let i = 0; i < this.trail.length; i++) {
      if (this.trail[i].xPos === xPos && this.trail[i].yPos === yPos)
        return true;
    }
    return false;
  }
}
