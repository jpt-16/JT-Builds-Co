---
title: "Is Your Business Website an ADA Lawsuit Risk?"
description: "What WCAG 2.1 AA means for a small business website, what actually gets sites sued, and what real accessibility looks like on a small business build today."
slug: "ada-website-compliance-small-business-massachusetts"
keywords:
  - ada website compliance small business
  - is my website an ada lawsuit risk
  - wcag 2.1 aa explained small business
  - website accessibility lawsuit
  - ada compliant website massachusetts
  - accessible website small business
date: "2026-08-31"
published: false
schema: "Article"
---

# Is Your Business Website an ADA Lawsuit Risk?

Most small business owners have never heard of WCAG or ADA website compliance, and the first time they do it is usually in a demand letter. That is a bad way to learn about it, and it is why this topic has a whole industry of fear attached to it.

I want to be careful here. I build websites to accessibility standards as a matter of course, so I have a commercial interest in you caring about this. I am also not a lawyer, and nothing below is legal advice. What I can do is lay out what the standard actually is, what the litigation data actually shows, and what fixing it actually involves — with sources, so you can check me.

## What ADA website compliance actually refers to

The Americans with Disabilities Act was written in 1990 and does not mention websites. Title III covers "places of public accommodation" — businesses open to the public. The unsettled question is whether a website counts as one.

Courts have split on it. Some federal circuits have held that a website is covered on its own; others have held it is covered only when tied to a physical location. Insurers describe the law as unsettled, and they are not being evasive — it genuinely is [EXTERNAL LINK: Hanover Insurance risk solutions, "Website accessibility guidelines and what they mean for your business"].

In April 2024 the Department of Justice issued a rule that does set a firm technical standard, adopting **WCAG 2.1 Level AA**. That rule applies to state and local government entities, not private businesses, and its compliance deadlines currently sit at April 2027 for larger entities and April 2028 for smaller ones after an extension published in April 2026 [EXTERNAL LINK: ADA.gov, "Fact Sheet: New Rule on the Accessibility of Web Content and Mobile Apps"].

So: no federal regulation currently forces your salon's website to meet WCAG. That is not the same as saying nothing can happen to you.

## What the litigation data actually shows

More than 5,000 digital accessibility lawsuits were filed in 2025, and roughly 64% of the companies sued had annual revenue under $25 million [EXTERNAL LINK: UsableNet, "ADA Web Lawsuit Trends for 2026," published 8 January 2026].

Two things follow from that, and both matter.

The first is that this is not only a Fortune 500 problem. Most defendants are not large companies.

The second is that "under $25 million in revenue" is a very wide bracket, and it does not mean two-person shops. The filings concentrate heavily on e-commerce — businesses that take money on the site. Independent analysts have made the point that most small businesses will never see a lawsuit, and that the litigation clusters around online retail [EXTERNAL LINK: TestParty, "Do Small Businesses Need Accessible Websites?"].

Here is my honest read. If you are a barbershop in Norwood with a five-page brochure site and a phone number, your realistic litigation risk is low. If you sell products online, run a booking and payment flow, or operate multiple locations, it is meaningfully higher. Owners in small business forums describe receiving demand letters from serial filers, and the letters are typically settlement demands rather than trials.

Fear-selling this topic is common and I do not want to add to it.

## The better reason to care

Set the lawsuits aside for a moment.

Roughly one in four American adults lives with some form of disability [EXTERNAL LINK: CDC, "Disability Impacts All of Us" data page — verify the current figure before publishing]. An inaccessible site does not politely degrade for them — it fails. A form with no labels cannot be completed with a screen reader. Text at low contrast cannot be read in bright sun on a phone, which is where most of your customers are. A button with no text is invisible to assistive software and to Google's crawler alike.

The overlap with plain quality is almost total. Nearly everything on the WCAG 2.1 AA list also makes a site faster, clearer, and easier for everyone else to use.

## What actually gets flagged

The failures are boringly consistent. WebAIM tests the top million home pages every year. In the February 2026 report, **95.9% had detectable WCAG failures**, averaging 56.1 errors per page, and six issues accounted for 96% of everything found [EXTERNAL LINK: WebAIM Million 2026 report]:

| Failure | Share of home pages |
|---|---|
| Low contrast text | 83.9% |
| Missing alternative text on images | 53.1% |
| Missing form input labels | 51.0% |
| Empty links | 46.3% |
| Empty buttons | 30.6% |
| Missing document language | 13.5% |

The same six have topped the list for seven years running.

Read that table again. None of these are exotic. Grey text on a white background. A photo with no description. A contact form where the boxes are unlabelled. A button that is an image with no text behind it. A page that never declares it is in English.

These are not hard problems. They are problems nobody checked for.

## What compliance looks like in practice

Ninety per cent of it is decisions made while building, at no extra cost:

- **Contrast.** Body text at a 4.5:1 ratio against its background, large text at 3:1. Free checkers verify this in seconds.
- **Alt text on images.** A short description of what the image shows. Decorative images get empty alt attributes so screen readers skip them.
- **Labelled form fields.** Every input has a real label, not just placeholder text that vanishes when you type.
- **Keyboard access.** Every link, button and form can be reached and used with the Tab key alone, with a visible focus outline.
- **Real headings.** One H1, then properly nested H2s and H3s. Not text made big and bold.
- **Descriptive link text.** "See the pricing page" rather than "click here."
- **Declared page language.** One attribute in the HTML.
- **Captions on video.** If you have video.

Every JT Builds site is tested to WCAG 2.1 AA before launch. It is part of the build, not an add-on, and it is not a line item on the invoice. [INTERNAL LINK: /services "What is included in a build"]

## A word about accessibility overlay widgets

You have probably seen the little accessibility icon in the corner of a site, offering to change contrast and font size. These are sold as one-line fixes.

I would be cautious. Accessibility practitioners have criticised overlays extensively, disability advocates have objected to them publicly, and businesses using them have still received demand letters. A widget layered over an inaccessible site does not make the underlying site accessible.

Building it correctly costs less than the annual subscription for most of these tools.

## Frequently asked questions

**Can I be sued if my website is not ADA compliant?**
Lawsuits and demand letters over website accessibility are filed regularly against private businesses, though the law remains unsettled on whether a website alone is a place of public accommodation. Over 5,000 digital accessibility lawsuits were filed in 2025, with most defendants under $25 million in revenue. Risk concentrates heavily on e-commerce. I am not a lawyer — if you have received a letter, speak to one.

**What is WCAG 2.1 AA in plain English?**
It is a published checklist for making web content usable by people with disabilities. Level AA is the middle tier and the one regulators and courts generally reference. In practice it means readable contrast, described images, labelled forms, full keyboard operation and properly structured headings.

**How much does it cost to make a website ADA compliant?**
Built correctly from the start, effectively nothing — it is a set of choices, not a feature. Retrofitting an existing site costs anywhere from a few hundred dollars for a small brochure site to many thousands for a large one. Overlay subscriptions typically run a few hundred dollars a year and do not fix the underlying problems.

**Does the 2024 Department of Justice rule apply to my small business?**
No. That rule adopts WCAG 2.1 AA for state and local government entities, with deadlines in April 2027 and April 2028. Private businesses are covered by Title III of the ADA, which has no published technical standard.

**How do I find out if my site has accessibility problems?**
Free automated checkers catch the common failures in the table above, which is most of what gets flagged. They do not catch everything — keyboard traps and confusing structure need a person. Start automated, then have someone tab through the site.

## Find out where you stand

The Website Health Report checks any business's site and explains what it finds in plain English, including issues that overlap with accessibility. It is free and there is no call attached to it.

[INTERNAL LINK: https://report.jtbuildsco.com/ "Run a free Website Health Report"]

If your site turns out to need work, that is worth knowing either way. [INTERNAL LINK: /posts/small-business-website-cost-massachusetts "What a rebuild costs in Massachusetts"] · [INTERNAL LINK: /pricing "My pricing, in two numbers"]

---

## Image suggestions

1. **Hero.** The same button shown twice, once at failing contrast and once at passing contrast, with the ratio labelled. Alt text: "The same website button shown at failing and passing colour contrast ratios."
2. **After the failures table.** A bar chart of the six most common WCAG failures from the WebAIM 2026 data. Alt text: "Bar chart of the six most common accessibility failures found on the top one million home pages in 2026."
3. **In the practice section.** A screenshot of a keyboard focus outline on a navigation link. Alt text: "A visible keyboard focus outline around a navigation link on a small business website."
4. **Closing.** A person using a screen reader on a phone. Alt text: "A person navigating a small business website on a phone using assistive technology."

---

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Is Your Business Website an ADA Lawsuit Risk?",
  "description": "What WCAG 2.1 AA means for a small business website, what actually gets sites sued, and what real accessibility looks like on a Massachusetts small business build.",
  "author": {
    "@type": "Person",
    "name": "Jake",
    "jobTitle": "Founder",
    "worksFor": {
      "@type": "LocalBusiness",
      "name": "JT Builds Co.",
      "url": "https://jtbuildsco.com"
    }
  },
  "publisher": {
    "@type": "Organization",
    "name": "JT Builds Co.",
    "url": "https://jtbuildsco.com"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://jtbuildsco.com/blog/ada-website-compliance-small-business-massachusetts"
  },
  "about": [
    { "@type": "Thing", "name": "Web accessibility" },
    { "@type": "Thing", "name": "WCAG 2.1 Level AA" },
    { "@type": "Thing", "name": "Americans with Disabilities Act" }
  ],
  "citation": [
    "https://webaim.org/projects/million/",
    "https://www.ada.gov/resources/2024-03-08-web-rule/"
  ],
  "disambiguatingDescription": "General information only. Not legal advice."
}
```
