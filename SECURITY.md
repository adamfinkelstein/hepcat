# Security

This document outlines various security aspects of Hepcat.

## Table of Contents

- [Security Philosophy](#security-philosophy)
- [Authentication](#authentication)
- [Authorization and Roles](#authorization-and-roles)
- [Conflict Management](#conflict-management)
- [Favorites](#favorites)
- [Stickies](#stickies)
- [Downloads](#downloads)
- [Reporting Vulnerabilities](#reporting-vulnerabilities)

# Security Philosophy

Note that the data in this app is relatively low stakes -- it contains no significant personal information other than email addresses. It is not a tragedy if the status of a paper in review is somehow revealed to the authors a few days early. We certainly hope that the titles and abstracts of all submitted papers are not leaked to the public, but this is not a particularly high-value target for would-be attackers.

A major design principle is that Hepcat contains no sensitive information that is not eventually revealed to the entire PC. For example, it _DOES NOT_ contain the PC assignments (primary and secondary for a paper), nor does it record the identity of someone who files a Sticky for a particular paper (which is highly correlated with those assignments). This of course makes it impossible for the software to leak that kind of information.

Caveats:

1. PC members ideally should not learn the status of conflicted papers _during_ the meeting. Measures are taken to hide this information, as described below. But a PC member (or outsider) might be able to reveal it by hacking, or by seeing someone else's screen during the meeting.

2. Typically the Chair organizes review information so that Hepcat contains individual reviewer recommendations (e.g. the primary review is Reject, whereas the secondary marked it as Accept), and this information should ideally remain unknown by people who are conflicted. Here applies the same caveat as above: measures are taken, but this might be discoverable.

All the data in Hepcat before and during the meeting is available to the PC Chair and any other user with Admin privileges. During the meeting, if the Chair is logged in with their own identity, the interface hides information about papers with which they are conflicted. However, if they wanted to discover information about the status of those papers, there are ways could could find it, for example by downloading a complete listing of the current status of all papers.

# Authentication

Authentication ensures that:

- people in the meeting are allowed to see certain data and take certain actions, and

- people outside the meeting cannot see that data or impact the meeting.

A user can be authenticated either of two ways:

- Match a hashed password previously stored in the database using the functions `generate_password_hash` and `check_password_hash` from `werkzeug.security`. See [tables.py](./app/models/tables.py).

- Match a token supplied by a previous login and stored in local storage (or session storage) in the same browser. See `generate_token` and `user_from_token` in [tables.py](./app/models/tables.py).

The token allows the login to be remembered across a browser refresh. The user chooses between local/session storage by checking a “remember me” box on login (checked for local storage; unchecked for session storage). Local storage means that the login will be remembered even if the browser is quit and restarted. Session storage allows a person to be logged into multiple accounts in Hepcat in different tabs in the same browser (useful both for debugging and certain admin activities).

Logged in users can change their password. Admins can change the password for any other user, which is helpful if someone lost their password.

Forgotten passwords can also be reset by email. A token is generated for the user with the given email, and then sent to that email address. The email message contains a link with the token, which allows the person to reset the password for that account. Thus access to a person's email implies access to the corresponding identity in Hepcat.

Logged in users have an active `socketio` connection to the server. Logging out disconnects it. Only one such connection may be made under a particular identity at a given time. If you login in one browser (leaving the connection open) and then login in a different browser (or different device or even different tab in the same browser) the older connection will be broken and a modal dialog will appear on the older browser saying so. This mechanism helps avoid the situation where an outsider with access to a PC member's account can lurk on the meeting. Doing so will cause the PC member and lurker to contend for the one connection, which is a signal something is wrong.

# Authorization and Roles

Each user/account is identified with a specific role among the following list, organized in order of decreasing capabilities:

- Super: At least one such account must exist in order to “bootstrap” the creation of other accounts, when starting from an empty database. Therefore the app automatically creates a couple accounts like this using passwords that are set in an environment variable at the running server.

- Chair: Not automatically created, but should be the actual identity of the Chair(s) so it can identify conflicted papers. Conflicts are highlighted in blue. Has many special privileges / capabilities in Hepcat.

- Admin: Same as Chair except conflicts are not highlighted.

- Backup: Backup Chair role has same properties as Normal below, except that conflicts are highlighted in blue (and in some modes, can select/view any room).

- Normal: This is the default role if not specified.

- Screen: Suitable for displaying on a big screen in the room, this hides some information that should not generally be seen, such as the outcomes of previous papers in the queue.

- Outside: Suitable for displaying on a screen outside the meeting room, most information is hidden but it's possible to see where in the queue the meeting is, and who is conflicted with the current paper.

## Roles Details

Screen and Outside accounts are automatically created by the server, one of each per room, once the list of rooms is known, using passwords that are set in an environment variable at the running server.

Other roles are established by the chair when uploading the “users file” before the meeting. Three of these roles collectively (Super, Chair, Admin) have “Admin” privileges in the app, which means they have extra interfaces for uploading data, filling the queue, seeing the full list of users, and “becoming” another user or setting their password.

## Roles Implementation

Some of the policies sketched above are implemented at the client and some at the server. Access to a logged in client therefore exposes some vulnerabilities to PC members who could potentially gain access to some information that is intended to be hidden from them. For example, regular PC members might be able to view the Admin interface provided in the app by changing a local variable in the client to indicate that they are actually an Admin. However, they would not be able to take Admin actions (like changing someone else's password), due to the following mechanism.

Any logged in user has a socketio connection which identifies that user, and thus their role, at the server. So any request arriving by socket that requires a particular role can be checked against the user role. Many of these checks are performed by function wrappers in
[decorators.py](./app/sockets/decorators.py) -- for
example the wrapper `@super_required_for_io` ensures that
the requester has the role Super. For example users with this role can wipe the database clean with one button click, whereas users with Chair and Admin roles cannot. Thus the Super role should be used sparingly.

Likewise all actions requested by roles with “Admin” privileges (e.g. setting or advancing the queue) are verified at the server before the action is taken.

In addition, almost all the information to be sent specifically to admins (like the full list of users and their status, or the list of data files already uploaded). Such info is sent by socketio broadcast to a “room” that only includes the Admin roles.

# Conflict Management

PC members are typically conflicted with one or more of the papers being reviewed. One of the major functions of Hepcat is to track these conflicts, help get PC members know they need to leave the room when conflicted, and manage this flow of PC members in and out of the room.

A PC member should not be able to see information about a paper on which they have a conflict. Hepcat sends most information about papers by broadcast, to all users including those with conflicts. To prevent PC members from being able to read the information about their conflicted papers, data about each paper is encrypted using a key unique to that paper.

Each paper has a public ID like “papers_0345” that is used in Linklings, and known by PC members even when they have a conflict with that paper. In Hepcat, in addition to the public ID, each paper has an obfuscated ID ("oid") that is a random string of 8 hex digits, and the mapping between the obfuscated ID and public ID is only known by non-conflicted users.

When a user logs in, they receive a list of encryption keys for papers that they are _not_ conflicted with, along with their obfuscated IDs. Thus, this list of keys is unique to each user, taking into account their specific conflicts.

When a user receives information about a paper, it is identified by its obfuscated ID. If they do not recognize that ID, they know they are conflicted with that paper, and do not even which which public ID it corresponds to. Moreover, they don't have the keys, so they cannot decrypt the message and discover anything about its contents.

# Favorites

Users can choose a set of “favorite” papers and these will be highlighted with stars in the Queue and can optionally be highlighted in the Grid. These are commonly used to mark papers to which a PC member was assigned, and thus should be considered sensitive information. Favorites (and all preferences) are therefore stored in local storage in the browser, and never transmitted to Hepcat. This has which has several implications. First, you can set different preferences for different computers (or even different browsers on the same computer), which may be helpful for different monitors etc. Second, because preferences are never sent to the Hepcat server, there is no way for this information to be “leaked” by the server to another user.

# Stickies

As mentioned above, Hepcat does not record the identity of someone who files a Sticky for a particular paper (which is highly correlated with reviewer assignments and is therefore highly sensitive information).

## Filing Stickies

This means that anyone logged into Hepcat can file a Sticky for any paper indicating any status (Tabled, Conference, Journal or Reject). Mainly this policy relies on the assumption that PC members are not malicious. However, it does permit mistakes that could affect the status of a paper. There are an extensive list of potential warnings issued for Stickies that seems out of place, for example a Sticky filed for a paper that apparently already converged. Nevertheless, a user could accidentally or deliberately ignore such warnings, and the warnings do not cover every situation. The most damaging potential mistake would be to mark a paper below the bar as Reject. All other situations would simply lead to the paper coming up in for discussion in the meeting, so they are relatively benign. Rejects below the bar are generally not discussed. Therefore it is crucial that these (and all paper statuses) are double-checked at the end of the meeting. This is discussed further in the Chair's Guide.

## Revoking Stickies

Users can “revoke” a Sticky that they previously filed, as long as no event has updated the status of that paper in the interim. Because Hepcat does not record the identity of a the user who files a Sticky, some mechanism must verify whether a particular user is allowed to revoke it. To achieve this goal, when a user files a Sticky, their Hepcat client generates a random key (string) and sends it with the other info for this Sticky (paper ID and status). The server sends back a confirmation containing the paper ID, the key, and an integer ID corresponding to the index in this paper's "history" corresponding this Sticky. These are stored in local storage in the client browser, and a list of "revokable" Stickies is shown to the user.
If the user later wants to revoke the sticky, the client app sends a request to the server including the paper ID and the key. If the key matches that of the latest item in the history for that paper, the Sticky is revoked. On the other hand, whenever an update occurs for that paper (for example a different Sticky or a status change marked in the meeting) these updates include a history index. If a paper update has a different index than the one stored in a client's local storage, the corresponding Sticky is removed from the list of revokable Stickies in local storage.

# Downloads

Users with Admin privileges can download a few different files, including a zip containing most of the data in the database. These downloads occur in a different browser tab. So they are served directly from Flask at a different URL, rather than being communicated through the socketio connection. Since this communication is not happening through socketio, the user is not authenticated. To ensure that the requester of the file at that URL has privilege to receive this data, the following procedure is used.

First, an Admin user sends a request for the data over the socketio connection. At this point the user is authenticated so the server can verify the Admin role. Next the server generates the file as well as a random key (string), saving the file in a directory named by that key. The server sends the name of the file as well as the key to the client (over socketio). Now the client opens a new tab requesting the file with a URL that contains both the filename and the key. If the key matches the server can deliver the file. However, before doing so, the server performs two more operations:

- It deletes any download files that are older than some short time interval (such as one minute). This prevents some third party from observing the URL (perhaps in a log) and also requesting the same file. It also cleans up the directory.

- It also moves the file from the key-specific subdirectory up to the parent directory. This prevents downloading the file more than one time, for example if an attacker happens to attempt a download after the original, but before the timeout. This strategy may still be vulnerable to a man-in-the-middle attack.

# Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly. **DO NOT report security vulnerabilities through public GitHub issues.**

Please send vulnerability reports to Adam Finkelstein at: `af@princeton.edu`
