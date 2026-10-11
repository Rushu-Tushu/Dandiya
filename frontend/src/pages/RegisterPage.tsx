import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import { AuthSplitLayout } from '../components/auth/AuthSplitLayout';
import { DanceLevel, LookingFor } from '../types';
import { Upload, Flame, Sparkles, Heart, Users, MapPin, AlertCircle, ArrowRight } from 'lucide-react';

const CITIES = ['Ahmedabad', 'Mumbai', 'Pune', 'Vadodara', 'Surat', 'Rajkot', 'Bengaluru', 'Delhi-NCR', 'Indore', 'Jaipur'];

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUserAndProfile } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState<number>(22);
  const [city, setCity] = useState('Ahmedabad');
  const [sex, setSex] = useState<'F' | 'M' | 'Other'>('F');
  const [danceLevel, setDanceLevel] = useState<DanceLevel>('Intermediate');
  const [lookingFor, setLookingFor] = useState<LookingFor>('Partner');
  const [bio, setBio] = useState('Here for the music, lights and good vibes!');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let uploadedPhotoUrl = '';
      if (photoFile) {
        try {
          const uploadRes = await api.uploadPhoto(photoFile);
          uploadedPhotoUrl = uploadRes.photoUrl;
        } catch {
          // fallback
        }
      }

      const res = await api.register({
        email,
        password,
        firstName,
        lastName,
        age: Number(age),
        city,
        sex,
        danceLevel,
        lookingFor,
        bio,
        photoUrl: uploadedPhotoUrl,
      });

      await setUserAndProfile(res.user, res.profile);
      navigate('/discover');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout activeTab="register">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold font-festive text-gray-900">
            Create Profile
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Simple 2-minute setup. Find someone to dance Dandiya &amp; Garba with this Navratri.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          {/* Section: Account Login Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B0036]">1. Account</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm bg-gray-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 chars"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm bg-gray-50/50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section: Basic Identity */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B0036]">2. Dancer Info</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Priya"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm bg-gray-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name (Optional)</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Shah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm bg-gray-50/50 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Age *</label>
                <input
                  type="number"
                  required
                  min={18}
                  max={99}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm bg-gray-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sex *</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm bg-white"
                >
                  <option value="F">Female (♀)</option>
                  <option value="M">Male (♂)</option>
                  <option value="Other">Other (⚧)</option>
                </select>
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#D81B60]" />
                <span>Your City *</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm mb-2 bg-gray-50/50 focus:bg-white"
              />
              <div className="flex flex-wrap gap-1">
                {CITIES.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCity(c)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] transition-colors ${
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
          </div>

          {/* Section: Dandiya Vibe */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B0036]">3. Dandiya Vibe</h3>

            {/* Dance Level */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Dance Level *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Beginner', 'Intermediate', 'Pro'] as DanceLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDanceLevel(lvl)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      danceLevel === lvl
                        ? 'border-[#8B0036] bg-pink-50 text-[#8B0036] font-bold shadow-xs'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <Flame
                      className={`w-3.5 h-3.5 mx-auto mb-0.5 ${
                        danceLevel === lvl ? 'text-[#D81B60]' : 'text-gray-400'
                      }`}
                    />
                    <span className="text-[11px]">{lvl}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Looking For */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Looking For *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLookingFor('Partner')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    lookingFor === 'Partner'
                      ? 'border-[#8B0036] bg-pink-50 text-[#8B0036] font-bold shadow-xs'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 mx-auto mb-0.5 text-rose-500" />
                  <span className="text-[11px]">Partner</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLookingFor('Friends')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    lookingFor === 'Friends'
                      ? 'border-[#8B0036] bg-pink-50 text-[#8B0036] font-bold shadow-xs'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 mx-auto mb-0.5 text-pink-500" />
                  <span className="text-[11px]">Friends</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLookingFor('Group')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    lookingFor === 'Group'
                      ? 'border-[#8B0036] bg-pink-50 text-[#8B0036] font-bold shadow-xs'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 mx-auto mb-0.5 text-blue-500" />
                  <span className="text-[11px]">Group</span>
                </button>
              </div>
            </div>

            {/* Short Bio */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Short Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Ready for Navratri beats..."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm bg-gray-50/50 focus:bg-white"
              />
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Profile Photo (1 is enough)</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full border-2 border-[#D81B60] overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <label className="cursor-pointer px-3.5 py-2 rounded-xl border border-pink-200 text-xs font-semibold text-[#8B0036] hover:bg-pink-50 transition-colors">
                  Upload Photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-base btn-festive-primary text-white shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                'Creating Profile...'
              ) : (
                <>
                  <span>Join Dandiya +1</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 pt-1">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-[#8B0036] hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </AuthSplitLayout>
  );
};
