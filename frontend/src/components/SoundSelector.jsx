import React, { useState, useRef } from "react";
import toast from "react-hot-toast";

export default function SoundSelector({ 
  isOpen, 
  onClose, 
  onSelect,
  availableSounds = [],
  onUpload
}) {
  const [selectedSound, setSelectedSound] = useState(null);
  const [volume, setVolume] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const handlePlay = (sound) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(`/sounds/${sound.file}`);
    audio.volume = volume / 100;
    audioRef.current = audio;

    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      toast.error(`Failed to play sound: ${sound.name}`);
      setIsPlaying(false);
    };

    audio.play();
    setIsPlaying(true);
    setSelectedSound(sound);
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleSelect = () => {
    if (selectedSound) {
      onSelect(selectedSound, volume);
      onClose();
    } else {
      toast.error("Please select a sound first");
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      onUpload(file);
      toast.success(`Sound uploaded: ${file.name}`);
    } else {
      toast.error("Please select a valid audio file");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-purple-500/20 rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">🎵 Sound Selector</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Volume Control */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-3">
            Volume: {volume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Sound Library */}
        <div className="mb-6">
          <h4 className="text-white font-semibold mb-3">Sound Library</h4>
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {availableSounds.map((sound, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedSound?.name === sound.name
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-gray-600 bg-gray-800 hover:border-purple-500/50'
                }`}
                onClick={() => setSelectedSound(sound)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-white font-semibold">{sound.name}</h5>
                    <p className="text-gray-400 text-sm">{sound.description}</p>
                    <p className="text-gray-500 text-xs">{sound.file}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlay(sound);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isPlaying && selectedSound?.name === sound.name
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {isPlaying && selectedSound?.name === sound.name ? '⏹️' : '▶️'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-6">
          <h4 className="text-white font-semibold mb-3">Upload Custom Sound</h4>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
              id="sound-upload"
            />
            <label
              htmlFor="sound-upload"
              className="cursor-pointer block"
            >
              <div className="text-4xl mb-2">🎵</div>
              <div className="text-white font-semibold mb-1">Drop audio files here</div>
              <div className="text-gray-400 text-sm">or click to browse</div>
              <div className="text-gray-500 text-xs mt-2">Supports: MP3, WAV, OGG, M4A</div>
            </label>
          </div>
        </div>

        {/* Selected Sound Info */}
        {selectedSound && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
            <h5 className="text-green-200 font-semibold mb-2">Selected Sound:</h5>
            <div className="text-white">
              <div className="font-semibold">{selectedSound.name}</div>
              <div className="text-sm text-green-200">{selectedSound.description}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleStop}
            disabled={!isPlaying}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Stop
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Select Sound
          </button>
        </div>
      </div>
    </div>
  );
}
