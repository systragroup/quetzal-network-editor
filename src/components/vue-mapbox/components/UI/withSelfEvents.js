export default {
  methods: {
    $_emitSelfEvent (event, data = {}) {
      this.$_emitMapEvent(event, { control: this.control, ...data })
    },
    /** Bind events for markers, popups and controls.
     * MapboxGL JS emits this events on popup or marker object,
     * so we treat them as 'self' events of these objects
     */
    $_bindSelfEvents (events, emitter) {
      let listeners = Object.keys(this.$attrs).filter(attr => attr.startsWith('on'))
      listeners = listeners.map(attr => attr.slice(2).toLowerCase())
      listeners.forEach(eventName => {
        if (events.includes(eventName)) {
          emitter.on(eventName, this.$_emitSelfEvent)
        }
      })
    },

    $_unbindSelfEvents (events, emitter) {
      if (events.length === 0) return
      if (!emitter) return
      events.forEach(eventName => {
        emitter.off(eventName, this.$_emitSelfEvent)
      })
    },
  },
}
