---
layout: post
title: Happy Birthday, Prebid.js!
head_title: Happy Birthday, Prebid.js!
description: Looking back on the first year of Prebid.js development 
permalink: /blog/happy-birthday-prebid-js
---

(_This post originally appeared on the [AppNexus blog](http://blog.appnexus.com/2016/prebid-js-a-year-in-the-life-of-an-open-sourced-ad-tech-project/).  It has been edited slightly for clarity._)

## The Beginning

About a year ago, the publisher engineering team at AppNexus began noticing a common problem with some of our forward-looking publishers: many of their websites were taking a long time to load.

Since all the pages were written in JavaScript and HTML, our team was able to dig deep and see why all those pages were taking their sweet page-load time. What we soon found was that these forward-looking publishers had started experimenting with header bidding, but the integrations weren't designed in the best interest of publishers.

To be specific, these integrations were blocking the page content from loading, and they interfered with other header bidding integrations. Some publishers reported 10 - 20% impression loss, because once a site stacks up a few header bidding partners, the page blocking effect goes up significantly.

After speaking one-on-one with our clients, we came to a pretty straightforward conclusion: the header bidding integrations were opaque. Publishers weren't given enough information about how they worked. In addition to the blocking behavior that causes latency and impression loss, each header bidding implementation was taking several weeks for publishers: in other words, way too long. Somewhere in the intensive process of writing a few hundred lines of code, of setting keywords and loading the right creatives, header bidding was devolving into a real-time traffic jam.

We quickly realized there is something we can do to significantly improve sites' user experience and monetization. At AppNexus, teams pride themselves on being agile to a fault - and ours wasn't an exception. I took a train to Philadelphia to meet with [Matt Kendall](https://github.com/mkendall07), a fellow AppNexus engineer. After a very intensive two weeks, we managed to build the first [Prebid.js](https://github.com/prebid/Prebid.js) container prototype, and presented it to the rest of the company and our publisher friends.

We knew how important this solution would be. Just like our forward-thinking publishers were willing to adopt this industry change with header bidding, we owed it to our publishers to pioneer this technology. The [Prebid.js](https://github.com/prebid/Prebid.js) container solution was one of the first container solutions available to publishers. While others in the industry were still trying to figure out header bidding, we were already thinking ahead on how we can make this technology better for publishers and easier to implement.

Only one question remained... how would we distribute it? The ad tech market has always been so competitive on revenue and profit, and there were other companies selling their proprietary solutions at a premium price. However, at AppNexus, our ultimate goal has always been to make the Internet a better place. We believe header bidding is on the right track, and the best way to help publishers is to teach them everything we learned, including the code we wrote, the challenges that early adopters have faced, and the efficient ad ops setting we were experimenting with. We also do not believe our solution can fit all, or is the best yet - publishers are smart and they know their pages the most.

Therefore, we open sourced the [Prebid.js](https://github.com/prebid/Prebid.js) code on GitHub and documented everything we learned on [Prebid.org](http://prebid.org). We wanted to help publishers unlock ideas and innovate faster, and to accelerate the growth and adoption of header bidding.

And - gulp! - we sent our baby out into the world.

## The Response

The first week after the launch of [Prebid.js](https://github.com/prebid/Prebid.js) we started receiving Github responses from publishers. The responses were positive - several key metrics were telling us publishers were deeply engaged with this product, even from day 1 with the minimum viable product. For example, users on average spent over 5 minutes on the site, and over 35% of the users came back to the [Prebid.org](http://prebid.org) site almost every day during the week - a sign suggesting they were reading and implementing [Prebid.js](https://github.com/prebid/Prebid.js).

And the power of open source started kicking in. On Github, publishers started posting comments, fixing bugs, and contributing code, big chunks of code! For example, our first version of [Prebid.js](https://github.com/prebid/Prebid.js) didn't have a popular header bidding partner implemented. Within a week, we received 3 versions of it, submitted by 3 different publishers!

To date, [our Github repo](https://github.com/prebid/Prebid.js) has received over 485 tickets (we closed 452 of them), 1600 comments, 237 pull requests, 173 forks, and 59 contributors. Over 25 companies have submitted their header bidding adaptors, making [Prebid.js](https://github.com/prebid/Prebid.js) one of the most collaborative ad tech projects. Over 2100 people have given us their emails to stay up to date with the latest news on [Prebid.js](https://github.com/prebid/Prebid.js). In June 2016 alone, we've had over 350 downloads of the custom built version of [Prebid.js](https://github.com/prebid/Prebid.js)!

We are also happy to see the fast growing adoption of [Prebid.js](https://github.com/prebid/Prebid.js) on publisher pages. According to the third party analytics provider [Builtwith](http://trends.builtwith.com/ads/Prebid), [Prebid.js](https://github.com/prebid/Prebid.js) saw exponential growth in the past year, and has been installed on over 12,000 sites!

## The Product Evolution

The [Prebid.js](https://github.com/prebid/Prebid.js) Engineering team has spent time and effort making sure the industry comes together to provide guidelines and consistency around header bidding. We began publishing more content around the problem of latency, strategies on how to reduce latency, and tips on how to simplify ad ops set ups for header bidding.

We also started building products to benchmark header bidding integrations. For example, we designed [Headerbid Expert](https://chrome.google.com/webstore/detail/headerbid-expert/cgfkddgbnfplidghapbbnngaogeldmop?hl=en), a browser plug-in, because we noticed publishers struggling to find out accurate latency information on their header bidding partners. To date, 3,000 users have downloaded [Headerbid Expert](https://chrome.google.com/webstore/detail/headerbid-expert/cgfkddgbnfplidghapbbnngaogeldmop?hl=en) - all the more interesting because the development of Headerbid Expert was a weekend project, plain and simple. During the course of one 48-hour mini-hackathon, we managed to build a tool that publishers and tech vendors alike seem to find cool and useful.

So, what's in store for the future of [Prebid.js](https://github.com/prebid/Prebid.js)? Well, header bidding is still in its early stages, and there is plenty of room for improvement and innovation. We want to keep [Prebid.js](https://github.com/prebid/Prebid.js) super light, simple, and fast, and that's our grand mission. Today's adaptor integrations still require much more data transfer than they need, and we know we can score a 10x speed improvement in the very near future, especially with the amount of support and adoption from the community.

We also want to make [Prebid.js](https://github.com/prebid/Prebid.js) excel on mobile pages, and we have a good plan for that. For the remainder of the year, we're going to invest heavily in those efforts so that publishers can enjoy faster page load, higher viewability rate, and much more efficient header bidding integrations.

Ultimately, as we see the continued success of header bidding, we'll continue our commitment to the evolution of header bidding - and our community will see the fruits of this labor in the near future. Happy Birthday to [Prebid.org](http://prebid.org)! Be sure to stay tuned for more exciting developments in this space.
