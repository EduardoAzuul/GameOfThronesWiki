NECESARY COMANDS TO RUN IT
npm init -y
npm install --save-dev nodemon

RUBRIC
30% - Proper setup of the Node+Express project
30% - Use of correct API calls
20% - Proper display in Mobile and full screen
15% - Design
  5% - Implementation of EJS 
  5% - Proper use of colors scheme
  5% - Completeness

  GoT Ultimate Guide
Your challenge is to build a GoT Ultimate guide to find all the important information of your favorite Game of Thrones characters. Using the Thrones API or the API of Ice & Fire you will have access to all the available information regarding all the families fighting for sitting on the Iron Throne. The goal of this project is for you to have a working enciclopedia to consult on all the suitor for the throne; for this purpose you will need to:

Build a UI that best represent the content shown in a catalog. It does not have to have a specific design, but it should contain all the features described below.
The image below illustrate an idea you may use, but you are NOT required to do so, this is just an proposal.
Build a backend server that will receive the call from the front end to display what is being asked. There should be 2 actions:
Next/Previous: As part of the UI, you should have a way of moving back or forward, this will just display one character at the time, following the numbering order that the API provides. If you reach the end of the list, you should continue on the other side (e.g if I am at position 1 and go back, I should go to the last element of the list and viceversa)
Search: You can search for a particular character based on its name. If the name does not exist, you should show an error screen but offer the option to go back to the beginning of your list.
Every Character display should include:
The image of the Character
ID
First Name
Last Name
Born & Dead date (If available)
Title(s)
Aliases
Family
Family crest
Some of this things have multiple entries, so you can decide how you want to display them. (Suggestion: Look at the Bootstrap elements available and study the option of using them)

Suggestions:

Before adding any styles, structure your content with HTML. Writing your HTML first can help focus your attention on creating well-structured content.
Write out the base styles for your project, including general content styles, such as `font-family` and `font-size`.
Start adding styles to the top of the page and work down. Only move on to the next section once you're happy with what you've completed on the area you're working on.
If any image is missing, make sure that you provide a default image so the design is not affected.