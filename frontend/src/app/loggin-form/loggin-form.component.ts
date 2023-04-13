import {Component} from '@angular/core';
import {ServerID} from "../../../../sources/game";
import {SettingsService} from "../settings.service";

@Component({
  selector: 'app-loggin-form',
  templateUrl: './loggin-form.component.html',
  styleUrls: ['./loggin-form.component.css']
})
export class LogginFormComponent {

  protected readonly ServerID = ServerID;

  constructor(private service: SettingsService) {
  }

  name: string = "";
  server: ServerID = ServerID.server1;

  join() {
    this.service.name = this.name;
    this.service.server = this.server;

    this.service.join();
  }
}
