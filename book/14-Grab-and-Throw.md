## Pick-up objects

Next we will implement the ability to grab an object and hold it in our hand.  The approach is:

1. Listen for when the squeeze button is pressed
2. If the hand mesh that squeezed the button is also intersecting a target mesh thenn consider that a hold action
3. Emit a user held object room event
4. Convert that to a component on the held object
5. Parent the held object to the hand