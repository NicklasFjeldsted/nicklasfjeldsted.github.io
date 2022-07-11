import { Component, Input, OnInit } from '@angular/core';
import { ControlContainer, FormArray, FormControl, FormGroup, FormGroupDirective } from '@angular/forms';
import { TableInputControl, TableRowControl, InputTableRow } from 'src/app/interfaces';


@Component({
  selector: 'input-table',
  templateUrl: './input-table.component.html',
  styleUrls: ['./input-table.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
})
export class InputTableComponent implements OnInit {

  constructor() { }

  @Input() group!: FormGroup;

  ngOnInit(): void {
    this.addRow();
  }

  addRow(): void {
    let inputTable = this.group as TableInputControl;
    let rows = inputTable.get('rows') as FormArray;
    rows.push(new FormGroup(
      {
        method: new FormControl(''),
        description: new FormControl('')
      }
    ));
  }

  public get TableRows(): TableRowControl[]
  {
    let inputTable = this.group as TableInputControl;
    let rows = inputTable.get('rows') as FormArray;
    return rows.controls as TableRowControl[];
  }
}
