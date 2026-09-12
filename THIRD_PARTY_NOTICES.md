# Third-party notices

## Opensource UI

The homepage hero in `src/app/page.tsx` adapts the Dot Grid pattern and the
underline decoration from Annotated Text. The adaptations use our existing
theme and static server markup, with no additional dependencies.

`src/components/repo/repo-card.tsx` adapts the GitHub Repo card layout with
our repository data and navigation. `src/components/home/hero-search.tsx`
adapts the Search Input's clear control and styling. The `depth` variant in
`src/components/ui/button.tsx` adapts Depth Outline for our existing button API.
`src/components/auth/sign-in-toast.tsx` adapts System Alert to show a dismissible
open-source invitation after sign-in, with a link to our GitHub repository.
`src/components/layout/notifications.tsx` adapts Notification and Deploy
Notification for repository likes, using our existing theme and native disclosure.

The public-page redesign also follows Opensource UI's Craft Bench design guide:
Geist typography, neutral surfaces, and hairline dividers. Profile and resource layouts draw on the Contact Profile and
Resource Links examples, adapted to our existing data and navigation.

Source: https://github.com/bidyut10/opensourceui

- `components/background-pattern/dot-grid-pattern.tsx`
- `components/underlines/annotated-text.tsx`
- `components/socials/github-repo-card.tsx`
- `components/inputs/search-input.tsx`
- `components/buttons/depth-outline-button.tsx`
- `components/notifications/system-alert-banner.tsx`
- `components/dropdowns/notification-dropdown.tsx`
- `components/notifications/deploy-notification-banner.tsx`
- `components/profile/contact-profile-card.tsx`
- `components/resources/resource-links-panel.tsx`

MIT License

Copyright (c) 2026 Bidyut Kundu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
