# Task specifications

Original specifications for the M.V.O. website. They describe what each part of the project must do and are the reference for acceptance criteria.

| File | Covers |
| --- | --- |
| [MVO_page.txt](MVO_page.txt) | Specialized masonry showcase page: design, layout, animations, responsiveness, and admin-managed content |
| [Admin_page.txt](Admin_page.txt) | "Website Content" admin page: page/section/content selectors, text, primary image and gallery editing, saving |
| [Backend.txt](Backend.txt) | Backend architecture: .NET, MediatR CQRS, FluentValidation, MySQL, media uploads, authorization, tests |

Decisions made while implementing:

- The site is Danish only.
- Placeholder images are used until the client supplies real ones.
- The footer is handled separately.
- Specialized masonry is a sub page of the main site, not a separate project.
