
## What this book is about

This book is a step-by-step guide to building a website that is also a platform for VR immersive experiences using Babylon.js (3D graphics in the browser), Elixir (serverside language/runtime that acts like an operating system), WebRTC (voice chat and video streams) and Phoenix Channels (other realtime communications).  I'll take you through the steps of starting a new project from the very first commit.  We'll gradually build capabilities up that you would expect in a VR immersive world such as seeing each other's avatar, hearing each other talk, being able to grab and throw things etc.  I'll be building something specific for my platform, but hopefully it gives you some ideas for building your own worlds.  Or give you a deep understanding of this particular stack so that you can contribute back to my open-source project.  By the end of the book you'll be able to deploy your own website that folks can easily visit in any head-mounted-display (HMD) that ships with a web browser such as the Oculus Quest.

### Who is this book for?

I wish I could say this book is for everyone that wants to create their own VR enabled website.  Though... software developers that have some experience with full stack web development will probably have the easiest time following this guide.  

I assume that the reader is already comfortable with using command lines at a terminal and website concepts like HTML, CSS, and Databases.  It will be helpful to know how to use Git and Docker and some working knowledge of javascript/typescript, Elixir and Phoenix.  I don't spend much time explaining those fundamentals because there are plenty of resources for that already.  Sometimes I explain a little more than I need to, but most times I don't otherwise this guide would be too long.  

Ultimately, web development of any kind is a messy business involving a long list of different technologies that even  experienced web developers have trouble wrangling.  We all need to Google, all the time.  Like constantly.  But if you love building experiences and are good at pushing through to learn, then let's get started!

### Why this particular set of technologies?

Indeed there are many ways to accomplish a goal and this is just one possible combination of libraries, languages and tools that bring forth web enabled VR.  I can almost hear the reader asking, "Why not use Node so that you can use javascript on the front-end and the back-end?  Why not use A-frame which is very easy to learn and has a community of plugins.  Why not Three.js?  Why should I learn Elixir and Phoenix?"

There is a lot more I wanted to write about how my journey started with those other choices and how my experience caused me to search for alternatives, but I don't want to rant too much so I'll keep it short.  Especially since it might be my own shortcomings as a programmer that caused me to hit a wall with those other solutions.  Suffice to say, your own mileage may vary, but this bullet list below is a small and incomplete commentary on different technologies that I passed through:

#### A-frame
- Built on Three.js
- Incredibly approachable, friendly and easy to get started with.
- Great introduction to Entity Component Systems (ECS).
- Later on I felt it was an unnecessary abstraction using HTML custom elements
- For any advanced behavior you'll need to drop into Three.js anyway.
- Someone on a forum stated it best this way: "It makes easy what was already easy, and makes more complex things that are already complex".
- Mozilla Hubs started with A-frame and decided to move away from it.

#### Three.js
- Large community, well known library.
- You can find lots of demos written in Three.js
- The demos were hard for me to build upon because Three.js breaks backward compatibility on each version.
- By extension, the promise of A-frame's library of components failed to live up to its promise for me because I couldn't get code to work together from different A-frame components because of version issues

#### Babylon.js
- Does pretty much all the things Three.js can do, but (and it's a huge deal) retains backward compatibility as a core tenant!
- Has a prototyping playground to share working code or troubleshoot with others
- Superb community that fixes bugs within 24 hours.
- Stitching together code from various playgrounds just works as expected.
- FrameVR chose Babylon.js for their immersive VR experience.
- Maintained actively by Microsoft employees.

#### Node on the backend
- Appealing to be able to reuse the same code between the frontend and backend
- Can use socket.io, express to serve up pages.  There are quite a few libraries, npm is a huge resource, but didn't find the same Phoenix like framework available.
- There exists the potential to write a server in either Three.js or Babylon.js that has access to the same physics engine that can operate as a server-side source of truth.
- I didn't explore this option more, because Phoenix provided a good enough framework for client heavy rendering and just using the server to bounce messages.  It's entirely possible that writing the server-side engine in Three.js or Babylon.js and then syncing the scene differences to the client could be another fruitful alternative approach.  

#### Phoenix/Elixir backend
- Elixir is a language/runtime that acts like a bunch of tiny processes (servers) that can communicate with each other, be distributed etc
- It has great patterns for supervision, resiliency, and changes the way I think about design.
- No code can be shared between the frontend and backend.
- Phoenix has Channels built into the framework as a way to build multiuser communications.
- Phoenix has Liveview to build interactive and pages.
- If one room goes down (crashes) it can be automatically restarted by a supervisor process, and won't impact any other room
- Mozilla Hubs uses Phoenix Channels and Elixir in their Reticulum Server.
- X-Plane flight simulator uses Elixir in their backend.


In summary, I chose particular tools because I think these selections positions the project in an attractive place to be able to start small and iterate yet has enough features that will allow us to scale horizontally later.

### Why not Unity?

While Unity has an HTML5 export which can target the browser, it has certain strengths and weaknesses.  Unity compiles it's code to run in the browser as a stand-alone artifact, so changes are you aren't developing in the browser most of the time, nor will you be calling the browser's APIs which would normally be readily available to you as a web developer.  

However, if you are already a Unity developer than you will feel right at home using the Unity IDE and therefore exporting a new build target should be easy and makes a lot of sense.  You'll also be able to take advantage of a lot of pre-built tooling, workflows, asset store, etc.  

The most powerful distinction I think I can make is that web native tech like Three.js or Babylon.js was made for the web to start with so you can freely intermingle regular web development-y code along side WebXR.  The web is already interconnected computers and networks.  In native website, jumping to another world is simply clicking on a link.  Web native sites are a webpage first, and a game second.  Unity is a game first, and a webpage second.

### Why not use off the shelf WebVR Services?


We now have a couple of companies that provide turn key solutions to hold meetings and classes in VR.  I've tried Mozilla Hubs and FrameVR that provide login mechanisms, different avatars and environments to choose from, tools like street view, laser pointers, white boarding etc.  Both of them seem to be doing well and continuing to add new features.  I would say, if you are an end-user looking for a VR platform to hang out with friends, host an event, teach a lecture, play a game etc, these might be great choices for you.  It would be like a merchant choosing Shopify instead of creating their own ecommerce website from scratch, which can save them a lot of effort in not rebuilding the same tooling.  

But there is also a certain amount of vendor lock-in you get when choosing a platform and you have to agree to their terms and conditions.  These platforms are also rather purpose built to hold Zoom/Skype like classes for students in VR.  There are plenty of built in menus for screen sharing, taking a screenshot, posting something to social media etc.  Plenty of built in functionality that you might not need or want.  You are also limited in how much you can customize an experience for your own visitors including the menus and login and management just outside of the VR experience.  Being able to build your own platform from the ground up will allow you to have complete control over your own customers and your own features.

### Summary

This book is about how to use the Phoenix Web Framework (and other building blocks like Babylon.js and WebRTC) to create a website that can host a variety of meeting rooms where each room URL is a 3D immersive web experience for games or meetings.  It's not a book that teaches Phoenix or Elixir (the language it's based on), or Typescript (the language Babylon.js is based on).  However we'll go over the design approach and share code snippets along the way so if you follow along from beginning to end you should have a good understanding of how every piece fits together.