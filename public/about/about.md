# About

Hepcat is an application designed to help the ACM SIGGRAPH Technical Papers PC meeting run efficiently. It serves several goals:

* Track the progress of paper decisions during the meeting.

* Report the list of people conflicted with specific papers so they can leave during the discussion and return to the meeting after the paper has been discussed.

* Assist the Chair in ordering the discussion of various papers so as to:

	- Minimize the in-and-out flow of people conflicted with papers.

	- Allow people who leave the meeting stay out for runs of a few papers, if possible. 

	- Avoid discussing a paper until the PC members involved with that paper are ready to discuss it.

### Functionality

The two main components of the application are (1) a "queue" of papers to be discussed in sequence, and (2) a "grid" showing the progress of all papers.

* show picture here.

The Papers Chair uses an administrative interface (not seen by most users) to fill the queue with papers meeting specific criteria (eg, not yet discussed, marked as "Tabled", etc). Hepcat reorders the list of papers using a Traveling Salesperson (TSP) solver, to minimize flow in and out of the meeting.

PC members can mark papers as ready to be discussed by filing a "stickie". (Prior to 2014 this was done by writing the paper ID on an actual "stickie note" and passing it to an administrator.)

* show picture here.

### Customization

The Preferences page lets you choose your own font sizes and color palette. This may be helpful for differences in how colors are displayed on different devices, or how colors are perceived by individual people.

![](about/color-preferences.png)

Choose one of the paper categories on the left (Unseen, Tabled, etc) and then use the color picker to change the color scheme for that paper. Text automatically switches from black to white when appearing over dark colors. The palette at the bottom of the color picker shows the default colors (in order of paper categories on the left), and so you can restore the defaults of any individual color by clicking on one of those. Or you can restore all defaults using the obvious button below.

In addition, you can choose a set of "favorites" and they will be highlighted in the papers "queue," and can optionally be highlighted in the "grid." This may be helpful for the primary reviewer to be able to note an upcoming paper in the queue for which they need to prepare to speak. It can also be helpful to track the progress of all papers assigned to a particular PC member.

Note that all preferences are saved in local storage in your browser, which has several implications. First, you can set different preferences for different computers (or even different browsers), which may be helpful for different monitors etc. Second, your preferences are not trasfered to the Hepcat server,
meaning there is no way for this information to be "leaked" by the server to another user -- important because "favorites" should be considered sensitive.

### History

This application was originally designed and written by
[Ben Edelman](https://www.benjaminedelman.com/) (Princeton '18) and
[Adam Finkelstein](http://www.cs.princeton.edu/~af/) for use during the SIGGRAPH 2014 PC meeting, and it has been incremementally adapted for every SIGGRAPH PC since then. 

In spring 2020, the PC meeting shifted from in person to online in Zoom.
[Szymon Rusinkiewicz](http://www.cs.princeton.edu/~smr/) wrote an application
called "Conflictbot" that listens to Hepcat's server communication and 
moved participants in and out of the plenary Zoom room based on their conflicts.
Subsequent meetings switched to using Ohyay for the online meeting, and 
Conflictbot was rewritten for Ohyay by 
[Kayvon Fatahalian](https://graphics.stanford.edu/~kayvonf/).

In summer 2022, the software was rebuilt from the ground up by
Baris Onat (Princeton '24) and Adam Finkelstein using modern web development tools.