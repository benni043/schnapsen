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
      for (let card of cards) {
        this.cards.push(card);
      }
    })

    this.socket.on("postAtout", (atout: Card) => {
      this.atout = atout;

      //TODO nach rejoin bekommt man atout nicht angezeigt
    })

    this.socket.on("newCard", (card: Card) => {
      this.cards.push(card);
    })

    this.socket.on("setCardSuccess", (card: Card) => {
      this.currCard = card;

      for (let i = 0; i < this.cards.length; i++) {
        if (this.cards[i].cardValue == card.cardValue && this.cards[i].cardColor == card.cardColor) {
          this.cards.splice(i, 1);
        }
      }
    })

    this.socket.on("setCardCount", (cardCount: number) => {
      this.cardCount = cardCount;
    })

    this.socket.on("alert", (message: string) => {
      alert(message)
    })

    this.socket.on("gameEndInformation", (winner: string) => {
      this.end = true;
      this.winner = winner;
    })

    this.socket.on("joinSucceed", () => {
      this.loggedIn = true;
    })

    this.socket.on("started", () => {
      this.started = true;
    })

    this.socket.on("clearCurrCard", () => {
      this.currCard = undefined;
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

  covered: boolean = false;

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
}
