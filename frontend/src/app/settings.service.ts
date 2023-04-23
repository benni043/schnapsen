import {Injectable} from '@angular/core';
import {NewGameData, ServerID, SetCardData} from "../../../sources/game";
import {connect, Socket} from "socket.io-client";
import {Card} from "../../../sources/cardEnum";

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  constructor() {
    this.socket = connect("http://localhost:3000/");

    this.socket.on("postCards", (cards: Card[]) => {
      this.cards = []
      for (let card of cards) {
        this.cards.push(card);
      }
    })

    this.socket.on("postAtout", (atout: Card) => {
      this.atout = atout
    })

    this.socket.on("newCard", (card: Card) => {
      this.cards.push(card);
    })

    this.socket.on("setCardSuccess", (card: Card) => {
      this.currCard = undefined;

      setTimeout(() => {
        this.currCard = card;

        for (let i = 0; i < this.cards.length; i++) {
          if (this.cards[i].cardValue == card.cardValue && this.cards[i].cardColor == card.cardColor) {
            this.cards.splice(i, 1);
          }
        }

        this.onMove = false;
      }, 10)
    })

    this.socket.on("setCardCount", (cardCount: number) => {
      this.cardCount = cardCount;
    })

    this.socket.on("alert", (message: string) => {
      setTimeout(() => {
        alert(message)
      }, 10);
    })

    this.socket.on("gameEndInformation", (winner: string) => {
      this.end = true;
      this.winner = winner;
      this.onMove = false;
    })

    this.socket.on("joinSucceed", () => {
      this.loggedIn = true;
    })

    this.socket.on("started", () => {
      this.started = true;
    })

    this.socket.on("clearCurrCard", () => {
      setTimeout(() => {
        console.log(100)
        this.currCard = undefined;
      }, 3000)
    })

    this.socket.on("say", (value: number) => {
      if(value == 20) {
        this.say20 = true;
      } else if (value == 40) {
        this.say40 = true;
      }
    })

    this.socket.on("clearSay", () => {
      this.say20 = false;
      this.say40 = false;
    })

    this.socket.on("getCover", () => {
        this.covered = true;
    })

    this.socket.on("opponent", (opponent: string) => {
      this.opponent = opponent;
    })

    this.socket.on("said", (count: number) => {
      alert("Der Gegner hat " + count + " angesagt!")
    })

    this.socket.on("swappedAtout", (atout: Card) => {
      alert("Atout wird ausgetauscht!")
      this.atout = undefined;

      setTimeout(() => {
        this.atout = {cardValue: atout.cardValue, cardColor: atout.cardColor} as Card;
        this.changeAtout = false;
      }, 10)
    })

    this.socket.on("setCurrCard", (card: Card) => {
      this.currCard = undefined;

      setTimeout(() => {
        this.currCard = {cardValue: card.cardValue, cardColor: card.cardColor} as Card;
      }, 10)
    })

    this.socket.on("swapAtoutAble", () => {
      this.changeAtout = true;
    })
  }

  cards: Card[] = []
  atout: Card | undefined;
  cardCount: number = 0;
  currCard: Card | undefined;

  end: boolean = false;
  winner: string = "";

  name: string = "";
  server: ServerID = ServerID.server1;
  socket: Socket | undefined;

  loggedIn: boolean = false;
  started: boolean = false;

  say20: boolean = false;
  say40: boolean = false;

  covered: boolean | undefined = false;

  opponent: string = "";

  changeAtout: boolean = false;

  onMove: boolean | undefined = undefined;

  join() {
    this.socket!.emit("newGame", {
      playerName: this.name,
      serverToConnect: this.server
    } as NewGameData);
  }

  makeMove(card: Card): void {
    this.socket!.emit("setCard", {
      playerName: this.name,
      serverToConnect: this.server,
      card: card
    } as SetCardData);
  }

  send20() {
    this.socket?.emit("sendSay",
      {
        playerName: this.name,
        serverToConnect: this.server,
        value: 20
      });
  }

  send40() {
    this.socket?.emit("sendSay",
      {
        playerName: this.name,
        serverToConnect: this.server,
        value: 40
      });
  }

  cover() {
    this.socket?.emit("sendCover", {playerName: this.name, serverToConnect: this.server} as NewGameData);
  }

  austauschen() {
    this.socket?.emit("swap", {playerName: this.name, serverToConnect: this.server} as NewGameData)
  }
}
