---
layout: default
title: Pre-populate state
parent: Code-based Features
grand_parent: Features
render_with_liquid: false
---

# Pre-populate state

The forms engine supports the ability to pre-populate form state using query string parameters. This feature enables applications to support passing specific parameter values through the form and on to the submission without the user having to enter these values.

The feature uses the HiddenField component to prevent against rogue state injection. Only query string parameters whose names exist as HiddenField components will be copied into state.

The parameter values get copied on first load of the form, and are simple key/value parameters e.g.:

```
?paramname1=paramval1,paramname2=paramname2
```

There is no limit set on the number of parameters. The keys and values get copied as-is (no case changes get applied).
