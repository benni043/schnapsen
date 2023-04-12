import {Component} from '@angular/core';
import {connect, Socket} from "socket.io-client";
import {NewGameData, ServerID, SetCardData} from "../../../sources/game";
import {Card, CardColors, CardValues} from "../../../sources/cardEnum";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private socket: Socket;

  name: string = "";
  server: ServerID = ServerID.server1;

  cards: Card[] = []

  atout: Card | undefined;

  cardCount: number = 0;

  currCard: Card | undefined;

  loggedIn: boolean = false;

  end: boolean = false;
  winner: string = "";

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

    this.socket.on("won", (cardCount: number) => {
      this.cardCount = cardCount;
    })

    this.socket.on("setCardSuccess", (card: Card) => {
      this.currCard = card;

      for (let i = 0; i < this.cards.length; i++) {
        if (this.cards[i].cardValue == card.cardValue && this.cards[i].cardColor == card.cardColor) {
          this.cards.splice(i, 1);
        }
      }
    })

    this.socket.on("newCard", (card: Card) => {
      this.cards.push(card);
      this.currCard = undefined;
    })

    this.socket.on("alert", () => {
      alert("Du bist nicht an der Reihe!");
    })

    this.socket.on("endAlert", () => {
      alert("Das Spiel ist bereits beendet!");
    })

    this.socket.on("end", (winner: string) => {
      this.end = true;
      this.winner = winner;
    })
  }

  join() {
    this.socket.emit("newGame", {playerName: this.name, serverToConnect: this.server} as NewGameData);
    this.loggedIn = true;
  }

  playCard(card: Card): void {
    this.socket.emit("setCard", {playerName: this.name, serverToConnect: this.server, card: card} as SetCardData);
  }

  protected readonly ServerID = ServerID;
  protected readonly CardValues = CardValues;
  protected readonly CardColors = CardColors;
}
