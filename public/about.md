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

### History

This application was originally designed and written by
[Ben Edelman](https://www.benjaminedelman.com/) (Princeton '18) and
[Adam Finkelstein](http://www.cs.princeton.edu/~af/) for use during the SIGGRAPH 2014 PC meeting, and it has been incremementally adapted for every SIGGRAPH PC since then. 
In summer 2022, the software was rebuilt from the ground up by
Baris Onat (Princeton '24) and Adam Finkelstein using modern web development tools.

### Customization

The Preferences page lets you choose your own font sizes and color palette. This may be helpful for differences in how colors are displayed on different devices, or how colors are perceived by individual people.

In addition, you can choose a set of "favorites" and they will be highlighted in the papers "queue," and can optionally be highlighted in the "grid." This may be helpful for the primary reviewer to be able to note an upcoming paper in the queue for which they need to prepare to speak. It can also be helpful to track the progress of all papers assigned to a particular PC member.

Note that preferences are saved in local storage in your browser, which has several implications. First, you can set different preferences for different computers (or even different browsers), which may be helpful for different monitors etc. Second, your preferences are not trasfered to the Hepcat server,
meaning there is no way for this information to be "leaked" by the server to another user -- important because "favorites" should be considered sensitive.


### Image example

It turns out that you can insert an image easily in Markdown:

![](logo512.png)

Wow!
