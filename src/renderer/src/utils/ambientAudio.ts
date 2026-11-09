// Web Audio API ambient sound generator — zero external audio assets required.

export type AmbientSoundType = 'rain' | 'noise' | 'waves' | 'cafe'

class AmbientAudioEngine {
  private ctx: AudioContext | null = null
  private gainNode: GainNode | null = null
  private filterNode: BiquadFilterNode | null = null
  private noiseSource: AudioBufferSourceNode | null = null
  private waveLfo: OscillatorNode | null = null
  private isPlaying: boolean = false
  private currentType: AmbientSoundType = 'rain'
  private currentVolume: number = 0.5

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx()
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    return this.ctx
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2 // 2-second loop
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const output = buffer.getChannelData(0)
    let lastOut = 0.0

    // Brown/Pink noise approximation
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      output[i] = (lastOut + 0.02 * white) / 1.02
      lastOut = output[i]
      output[i] *= 3.5 // Volume normalization
    }
    return buffer
  }

  public play(type: AmbientSoundType = this.currentType, volume: number = this.currentVolume): void {
    this.stop()
    this.currentType = type
    this.currentVolume = volume

    const ctx = this.getContext()
    const buffer = this.createNoiseBuffer(ctx)

    this.noiseSource = ctx.createBufferSource()
    this.noiseSource.buffer = buffer
    this.noiseSource.loop = true

    this.filterNode = ctx.createBiquadFilter()
    this.gainNode = ctx.createGain()
    this.gainNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime)

    switch (type) {
      case 'rain':
        // Low-pass filtered noise with gentle mid-presence
        this.filterNode.type = 'lowpass'
        this.filterNode.frequency.setValueAtTime(1200, ctx.currentTime)
        this.filterNode.Q.setValueAtTime(1.0, ctx.currentTime)
        break
      case 'noise':
        // Deep brown noise
        this.filterNode.type = 'lowpass'
        this.filterNode.frequency.setValueAtTime(500, ctx.currentTime)
        this.filterNode.Q.setValueAtTime(0.5, ctx.currentTime)
        break
      case 'waves': {
        // Band-pass noise modulated by a slow 0.15Hz LFO
        this.filterNode.type = 'bandpass'
        this.filterNode.frequency.setValueAtTime(450, ctx.currentTime)
        this.filterNode.Q.setValueAtTime(2.0, ctx.currentTime)

        this.waveLfo = ctx.createOscillator()
        const lfoGain = ctx.createGain()
        this.waveLfo.frequency.setValueAtTime(0.12, ctx.currentTime) // 8-second wave cycle
        lfoGain.gain.setValueAtTime(350, ctx.currentTime)
        this.waveLfo.connect(lfoGain)
        lfoGain.connect(this.filterNode.frequency)
        this.waveLfo.start()
        break
      }
      case 'cafe':
        // Warm low ambient hum
        this.filterNode.type = 'lowpass'
        this.filterNode.frequency.setValueAtTime(800, ctx.currentTime)
        this.filterNode.Q.setValueAtTime(1.2, ctx.currentTime)
        break
    }

    this.noiseSource.connect(this.filterNode)
    this.filterNode.connect(this.gainNode)
    this.gainNode.connect(ctx.destination)

    this.noiseSource.start()
    this.isPlaying = true
  }

  public setVolume(volume: number): void {
    this.currentVolume = volume
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(volume * 0.4, this.ctx.currentTime)
    }
  }

  public stop(): void {
    if (this.noiseSource) {
      try {
        this.noiseSource.stop()
        this.noiseSource.disconnect()
      } catch {
        // Ignored
      }
      this.noiseSource = null
    }
    if (this.waveLfo) {
      try {
        this.waveLfo.stop()
        this.waveLfo.disconnect()
      } catch {
        // Ignored
      }
      this.waveLfo = null
    }
    this.isPlaying = false
  }

  public getStatus(): { isPlaying: boolean; type: AmbientSoundType; volume: number } {
    return {
      isPlaying: this.isPlaying,
      type: this.currentType,
      volume: this.currentVolume
    }
  }
}

export const ambientAudio = new AmbientAudioEngine()

