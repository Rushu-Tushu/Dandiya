import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api, getAssetUrl } from '../lib/api';
import { DanceLevel, LookingFor } from '../types';
import { Upload, Flame, Heart, Users, Sparkles, MapPin, Check, User } from 'lucide-react';

const CITIES = ['Ahmedabad', 'Mumbai', 'Pune', 'Vadodara', 'Surat', 'Rajkot', 'Bengaluru', 'Delhi-NCR', 'Indore', 'Jaipur'];

export const ProfileEditPage: React.FC = () => {
  const { profile, updateProfileState } = useAuthStore();

  const [firstName, setFirstName] = useState(profile?.firstName || '');
  const [lastName, setLastName] = useState(profile?.lastName || '');
  const [age, setAge] = useState(profile?.age || 22);
  const [city, setCity] = useState(profile?.city || 'Ahmedabad');
  const [sex, setSex] = useState(profile?.sex || 'F');
  const [danceLevel, setDanceLevel] = useState<DanceLevel>(profile?.danceLevel || 'Intermediate');
  const [lookingFor, setLookingFor] = useState<LookingFor>(profile?.lookingFor || 'Partner');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoPreview, setPhotoPreview] = useState(profile?.photoUrl || '');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName || '');
      setAge(profile.age);
      setCity(profile.city);
      setSex(profile.sex);
      setDanceLevel(profile.danceLevel);
      setLookingFor(profile.lookingFor);
      setBio(profile.bio);
      setPhotoPreview(profile.photoUrl);
    }
  }, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const res = await api.uploadPhoto(file);
        setPhotoPreview(res.photoUrl);
        if (profile) {
          updateProfileState({ ...profile, photoUrl: res.photoUrl });
        }
      } catch (err: any) {
        alert(err.message || 'Photo upload failed');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const updated = await api.updateProfile({
        firstName,
        lastName,
        age: Number(age),
        city,
        sex: sex as any,
        danceLevel,
        lookingFor,
        bio,
      });

      updateProfileState(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-pink-100 p-8 sm:p-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center text-[#8B0036]">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-gray-900">Edit Your Profile</h1>
            <p className="text-xs text-gray-500">Update your Dandiya preferences and details</p>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profile saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 text-sm">
          {/* Avatar section */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Profile Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-2 border-[#D81B60] overflow-hidden bg-gray-50 shrink-0">
                <img
                  src={
                    getAssetUrl(photoPreview) ||
                    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                      firstName || 'User'
                    )}`
                  }
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>

              <label className="cursor-pointer px-4 py-2 rounded-xl border border-pink-200 text-xs font-semibold text-[#8B0036] hover:bg-pink-50 transition-colors flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                Change Photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Last Name (Optional)
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Age
              </label>
              <input
                type="number"
                min={18}
                max={99}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Sex
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm bg-white"
              >
                <option value="F">Female (♀)</option>
                <option value="M">Male (♂)</option>
                <option value="Other">Other (⚧)</option>
              </select>
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#D81B60]" />
              <span>City</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    city === c
                      ? 'bg-[#8B0036] text-white font-semibold'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Dance Level */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Dance Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Beginner', 'Intermediate', 'Pro'] as DanceLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDanceLevel(lvl)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    danceLevel === lvl
                      ? 'border-[#8B0036] bg-pink-50 text-[#8B0036] font-bold shadow-xs'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <Flame
                    className={`w-4 h-4 mx-auto mb-1 ${
                      danceLevel === lvl ? 'text-[#D81B60]' : 'text-gray-400'
                    }`}
                  />
                  <span className="text-xs">{lvl}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Looking For */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Looking For
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLookingFor('Partner')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  lookingFor === 'Partner'
                    ? 'border-[#8B0036] bg-pink-50 text-[#8B0036] font-bold shadow-xs'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                <Heart className="w-4 h-4 mx-auto mb-1 text-rose-500" />
                <span className="text-xs">Partner</span>
              </button>

              <button
                type="button"
                onClick={() => setLookingFor('Friends')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  lookingFor === 'Friends'
                    ? 'border-[#8B0036] bg-pink-50 text-[#8B0036] font-bold shadow-xs'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                <Users className="w-4 h-4 mx-auto mb-1 text-pink-500" />
                <span className="text-xs">Friends</span>
              </button>

              <button
                type="button"
                onClick={() => setLookingFor('Group')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  lookingFor === 'Group'
                    ? 'border-[#8B0036] bg-pink-50 text-[#8B0036] font-bold shadow-xs'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                <Sparkles className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                <span className="text-xs">Group</span>
              </button>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Short Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-2xl font-semibold text-sm btn-festive-primary text-white shadow-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
