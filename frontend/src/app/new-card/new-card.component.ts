import {Component, Input, OnInit} from '@angular/core';
import {CardColors, CardValues} from "../../../../sources/cardEnum";

@Component({
  selector: 'app-new-card',
  templateUrl: './new-card.component.html',
  styleUrls: ['./new-card.component.css']
})
export class NewCardComponent implements OnInit{

  @Input() colorC: CardColors | undefined;
  @Input() valueC: CardValues | undefined;

  value: string = "";
  path: string = "/assets/resources/";

  backwards: boolean = false;

  ngOnInit(): void {
    if(this.colorC == undefined && this.valueC == undefined) {
      this.backwards = true;
    } else {
      this.func();
    }
  }

  func() {
    switch (this.colorC) {
      case CardColors.diamond: {
        this.path += "diamond.jpg";
        break;
      }
      case CardColors.heart: {
        this.path += "heart.jpg";
        break;
      }
      case CardColors.spade: {
        this.path += "spade.jpg";
        break;
      }
      case CardColors.club: {
        this.path += "club.jpg";
        break;
      }
    }

    switch (this.valueC) {
      case CardValues.Jack: {
        this.value = "J";
        break;
      }
      case CardValues.Queen: {
        this.value = "Q";
        break;
      }
      case CardValues.King: {
        this.value = "K";
        break;
      }
      case CardValues.Ten: {
        this.value = "10";
        break;
      }
      case CardValues.Ace: {
        this.value = "A";
        break;
      }
    }
  }

}
