import React, { Component } from "react";
import GameBoard from "./GameBoard";
import GameOver from "./GameOver";
import Promise from "promise";
import Swipe from "react-easy-swipe";

const MOVE_DIR = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

let tileUUID = 0;

export default class Game extends Component {
  constructor(props) {
    super(props);
    this.state = this.getInitialState();
  }

  componentDidMount() {
    this.newTile();
    this.newTile();
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleSwipeRight = this.handleSwipeRight.bind(this);
    this.handleSwipeLeft = this.handleSwipeLeft.bind(this);
    this.handleSwipeDown = this.handleSwipeDown.bind(this);
    this.handleSwipeUp = this.handleSwipeUp.bind(this);
    window.addEventListener("keydown", this.handleKeyPress);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleKeyPress);
  }

  handleKeyPress(ev) {
    let { key } = ev;

    if (!this.state.gameStarted) return;
    let match = key.toLowerCase().match(/arrow(up|right|down|left)/);
    if (match) {
      this.move(match[1]);
      ev.preventDefault();
    }
  }

  handleSwipeRight() {
    if (!this.state.gameStarted) return;
    this.move("right");
  }
  handleSwipeLeft() {
    if (!this.state.gameStarted) return;
    this.move("left");
  }
  handleSwipeDown() {
    if (!this.state.gameStarted) return;
    this.move("down");
  }
  handleSwipeUp() {
    if (!this.state.gameStarted) return;
    this.move("up");
  }

  getInitialState() {
    let size = 4;
    let cells = [];
    for (let i = 0; i < size; i++) {
      let row = (cells[i] = []);
      for (let j = 0; j < size; j++) {
        row[j] = null;
      }
    }
    return {
      size,
      cells,
      gameStarted: true,
      additionScores: [],
      score: 0,
      bestScore: +localStorage.getItem("mstf2048BestScore"),
    };
  }

  eachCell(state, fn) {
    return state.cells.forEach((row, i) =>
      row.forEach((cell, j) => fn(cell, i, j))
    );
  }

  newTile() {
    this.setState((state) => {
      let cells = this.state.cells;
      let emptyCells = [];
      // bo??lar?? getir ve merge edilecekleri et
      this.eachCell(state, (cell, i, j) => {
        if (!cell) {
          emptyCells.push([i, j]);
        } else if (cell.mergedItem) {
          // merge et
          cell.number += cell.mergedItem.number;
          cell.newMerged = true; // merge edilenler i??in i??aret
        }
      });
      if (emptyCells.length) {
        let index = Math.floor(Math.random() * emptyCells.length);
        let [row, cell] = emptyCells[index];
        cells[row][cell] = {
          number: Math.random() > 0.8 ? 4 : 2,
          newGenerated: true,
          newMerged: false,
          mergedItem: null,
          uuid: tileUUID++,
        };
      }
      return { cells };
    });
  }

  isMovable() {
    let movable = false;
    let cells = this.state.cells;
    let size = this.state.size;
    // h??creleri kontrol et
    // bo?? h??cre varsa moveable
    // ayn?? numaral?? h??creler movable
    this.eachCell(this.state, (cell, i, j) => {
      if (movable) return; // break;
      if (!cell) {
        movable = true;
        return;
      }
      if (i < size - 1) {
        let bottomCell = cells[i + 1][j];
        if (bottomCell && bottomCell.number === cell.number) {
          movable = true;
          return;
        }
      }
      if (j < size - 1) {
        let rightCell = cells[i][j + 1];
        if (rightCell && rightCell.number === cell.number) {
          movable = true;
          return;
        }
      }
    });

    return movable;
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  move(dir) {
    if (this.isMoving) return;
    let size = this.state.size;
    let cells = this.state.cells;
    let dirOffset = MOVE_DIR[dir];
    let hasMovingTile = false;
    let score = 0;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let row = i,
          col = j;
        if (dir === "right") {
          // sa??dan sola tekrar?? i??in reverse et
          col = size - j - 1;
        }
        if (dir === "down") {
          // a??a????dan yukar?? i??in reverse
          row = size - i - 1;
        }

        //y??ne g??re i j yi sat??r s??t??na e??le
        let cell = cells[row][col];
        if (!cell) continue; // h??cre bo??sa devam et

        // taglar?? s??f??rla
        cell.newGenerated = false;
        cell.newMerged = false;
        cell.mergedItem = null;

        // y??ne g??re sonraki h??creyi bul
        // sonraki koord al
        let nextCol = col + dirOffset[0];
        let nextRow = row + dirOffset[1];
        let nextCell;

        // oyun alan?? d??????na ????kma
        while (
          nextCol >= 0 &&
          nextCol < size &&
          nextRow >= 0 &&
          nextRow < size
        ) {
          nextCell = cells[nextRow][nextCol];
          if (nextCell) {
            // gidilen y??nde dolu hicre varsa ????k
            break;
          }
          //sonraki h??cre bo??sa devam et
          nextCol += dirOffset[0];
          nextRow += dirOffset[1];
        }

        if (
          nextCell &&
          !nextCell.mergedItem &&
          nextCell.number === cell.number
        ) {
          // ba??ka h??creyle birle??memi?? ayn?? say??l?? h??creyi al
          cell.mergedItem = nextCell;
          cells[nextRow][nextCol] = cell;
          cells[row][col] = null;
          hasMovingTile = true;
          score += nextCell.number + cell.number; // skor hesab??
        } else {
          // farkl?? say??l?? ya da yeni merge edilen h??cre varsa yan??na yerle??
          nextCol -= dirOffset[0];
          nextRow -= dirOffset[1];

          if (nextCol !== col || nextRow !== row) {
            cells[nextRow][nextCol] = cell;
            cells[row][col] = null;
            hasMovingTile = true;
          }
        }
      }
    }

    if (hasMovingTile) {
      this.isMoving = true;

      this.setState((state) => {
        let nextState = {
          cells,
          score: state.score + score,
        };
        if (score) {
          nextState.additionScores = [
            ...state.additionScores,
            { score, key: Date.now() },
          ];
        }
        return nextState;
      });

      // yeni say?? i??in beklet
      this.sleep(100).then(() => {
        this.newTile();
        this.checkGameStatus();
        this.isMoving = false;
      });
    }
  }

  checkGameStatus() {
    let movable = this.isMovable();
    if (!movable) {
      //oyun bitti kontrol??
      let bestScore = this.state.bestScore;
      if (bestScore < this.state.score) {
        bestScore = this.state.score;
        localStorage.setItem("mstf2048BestScore", bestScore);
      }
      this.setState({ gameStarted: false, bestScore });
    }
  }

  render() {
    return (
      <Swipe
        allowMouseEvents={true}
        onSwipeRight={this.handleSwipeRight}
        onSwipeLeft={this.handleSwipeLeft}
        onSwipeUp={this.handleSwipeUp}
        onSwipeDown={this.handleSwipeDown}
        tolerance={70}
        
      >
        <GameBoard
          {...this.state}
          onAdditionScoreAnimationEnd={this.handleAdditionScoreAnimationEnd.bind(
            this
          )}
          onNewGame={this.startNewGame.bind(this)}
        >
          {!this.state.gameStarted && (
            <GameOver onNewGame={this.startNewGame.bind(this)}></GameOver>
          )}
        </GameBoard>
      </Swipe>
    );
  }

  handleAdditionScoreAnimationEnd(ev, scoreItem, index) {
    this.setState((state) => {
      let additionScores = state.additionScores;
      //skorun ??st??ne eklememek i??in animasyondan sonra arrayi bo??altt??m
      return { additionScores: [...additionScores.slice(index + 1)] };
    });
  }

  startNewGame() {
    setTimeout(() => {
      tileUUID = 0;
      this.setState(this.getInitialState());
      this.newTile();
      this.newTile();
    }, 0);
  }
}
