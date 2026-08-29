# Common errors

## `html() must be used as a tagged template`

Use ``html`<p>${value}</p>` ``. Do not call `html('<p>...</p>')`.

## `onMount() must be called inside a component`

Call `onMount` while executing a function passed to `component` or directly to `mount`.

## `use:bind expects a writable signal`

The binding must receive a signal created with `signal()`, not a Computed or a raw value.

## `Duplicate list key`

Every value returned by `getKey` must be unique in the current list.

## `Reactive loop detected`

An Effect probably writes to a dependency that it reads. Move that write into an event, a Computed or a controlled `batch`.

Computed errors propagate to the read that triggered them. Synchronous Effect errors propagate to the write after the other subscribers have been notified.

## Missing styles

Check that the `css(...)` definition is used with `use:style` and that the component has a root element.

## Props modified inside a component

Props are read-only. Create a local signal if the component needs to change a value.
