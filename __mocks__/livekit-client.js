class Room {
  constructor() { this.localParticipant = {permissions: {}, setMicrophoneEnabled: async () => undefined}; }
  on() { return this; }
  async connect() { return undefined; }
  disconnect() { return undefined; }
}
const RoomEvent = {
  TrackSubscribed: 'trackSubscribed',
  TrackUnsubscribed: 'trackUnsubscribed',
  Reconnecting: 'reconnecting',
  Reconnected: 'reconnected',
  Disconnected: 'disconnected',
  ParticipantPermissionsChanged: 'participantPermissionsChanged',
};
module.exports = {Room, RoomEvent};
