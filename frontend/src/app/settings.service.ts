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
    })

    this.socket.on("newCard", (card: Card) => {
      this.cards.push(card);
      this.currCard = undefined;
    })

    this.socket.on("setCardSuccess", (card: Card) => {
      this.currCard = card;

      for (let i = 0; i < this.cards.length; i++) {
        if (this.cards[i].cardValue == card.cardValue && this.cards[i].cardColor == card.cardColor) {
          this.cards.splice(i, 1);
        }
      }
    })

    this.socket.on("playerMoveInformation", (cardCount: number) => {
      this.cardCount = cardCount;
    })

    this.socket.on("gameStartedError", () => {
      alert("Dieser Server ist bereits in Benützung!")
    })

    this.socket.on("playerNotOnMoveError", () => {
      alert("Du bist nicht an der Reihe!");
    })

    this.socket.on("gameFinishedError", () => {
      alert("Das Spiel ist bereits beendet!");
    })

    this.socket.on("gameEndInformation", (winner: string) => {
      this.end = true;
      this.winner = winner;
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

  join() {
    this.socket!.emit("newGame", {
      playerName: this.name,
      serverToConnect: this.server
    } as NewGameData);

    this.loggedIn = true;
  }

  makeMove(card: Card): void {
    this.socket!.emit("setCard", {
      playerName: this.name,
      serverToConnect: this.server,
      card: card
    } as SetCardData);
  }

}
