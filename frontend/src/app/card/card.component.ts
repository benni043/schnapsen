import {Component, Input} from '@angular/core';
import {SettingsService} from "../settings.service";
import {Card, CardColors, CardValues} from "../../../../sources/cardEnum";

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})
export class CardComponent {

  constructor(public service: SettingsService) {}

  protected readonly CardValues = CardValues;
  protected readonly CardColors = CardColors;

  @Input() card: Card | undefined;
  @Input() cardNum: number = 0;
}
