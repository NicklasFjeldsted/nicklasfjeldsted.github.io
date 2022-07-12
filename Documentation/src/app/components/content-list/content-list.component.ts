import { Component, Input, OnInit } from '@angular/core';
import { collection, collectionData, collectionGroup, Firestore, doc, getDocs } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'content-list',
  templateUrl: './content-list.component.html',
  styleUrls: ['./content-list.component.css']
})
export class ContentListComponent implements OnInit {

  constructor(private firestore: Firestore, private router: Router) { }

  @Input() chapters: string[] = [];
  public href: string[] = [];
  public chapterIndex = 0;

  ngOnInit(): void {
    this.chapters.push("test1", "test2");
    this.updateList();
    console.log(this.chapters);

  }

  updateList(): void {
    this.chapters.forEach(chapter => {
      this.href.push(this.router.url.concat("#",chapter));
    })
    console.log(this.href);
  }

  getChapterId(): void {

  }

  addActive(event: Event): void {
    let elementId: string = (<HTMLElement>event.target).parentElement!.id;
    console.log(elementId);
    document.querySelectorAll('.active').forEach(item => {
      item.classList.remove('active');
    });
    document.getElementById(elementId)?.classList.add('active');
  }

}
