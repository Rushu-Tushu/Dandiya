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
  const [bio, setBio] = useState('Here for the music, lights, and good vibes!');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupStartedTracked, setSignupStartedTracked] = useState(false);

  React.useEffect(() => {
    api.trackEvent({ eventType: 'page_view', route: '/register' });
  }, []);

  const handleInputChange = () => {
    if (!signupStartedTracked) {
      setSignupStartedTracked(true);
      api.trackEvent({ eventType: 'signup_started' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      handleInputChange();
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

      api.trackEvent({ eventType: 'signup_completed' });
      api.trackEvent({ eventType: 'profile_completed' });

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
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground">
            Create Profile
          </h1>
          <p className="text-sm text-muted-foreground font-hand text-base">
            Simple 2-minute setup. Find someone to dance Dandiya &amp; Garba with this Navratri.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          {/* Section: Account Login Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">1. Account</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="At least 8 chars"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section: Basic Identity */}
          <div className="space-y-3 pt-3 border-t border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">2. Dancer Info</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="e.g. Priya"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Last Name (Optional)</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="e.g. Shah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Age *</label>
                <input
                  type="number"
                  required
                  min={18}
                  max={99}
                  value={age}
                  onChange={(e) => {
                    setAge(Number(e.target.value));
                    handleInputChange();
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Sex *</label>
                <select
                  value={sex}
                  onChange={(e) => {
                    setSex(e.target.value as any);
                    handleInputChange();
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm cursor-pointer"
                >
                  <option value="F">Female (♀)</option>
                  <option value="M">Male (♂)</option>
                  <option value="Other">Other (⚧)</option>
                </select>
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#D81B60]" />
                <span>Your City *</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  handleInputChange();
                }}
                placeholder="Enter city"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm mb-2"
              />
              <div className="flex flex-wrap gap-1">
                {CITIES.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCity(c);
                      handleInputChange();
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                      city === c
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Dandiya Vibe */}
          <div className="space-y-3 pt-3 border-t border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">3. Dandiya Vibe</h3>

            {/* Dance Level */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Dance Level *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Beginner', 'Intermediate', 'Pro'] as DanceLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setDanceLevel(lvl);
                      handleInputChange();
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      danceLevel === lvl
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Flame
                      className={`w-3.5 h-3.5 mx-auto mb-0.5 ${
                        danceLevel === lvl ? 'text-[#D81B60]' : 'text-muted-foreground'
                      }`}
                    />
                    <span className="text-[11px]">{lvl}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Looking For */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Looking For *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLookingFor('Partner');
                    handleInputChange();
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    lookingFor === 'Partner'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 mx-auto mb-0.5 text-rose-500" />
                  <span className="text-[11px]">Partner</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLookingFor('Friends');
                    handleInputChange();
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    lookingFor === 'Friends'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 mx-auto mb-0.5 text-pink-500" />
                  <span className="text-[11px]">Friends</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLookingFor('Group');
                    handleInputChange();
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    lookingFor === 'Group'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 mx-auto mb-0.5 text-blue-500" />
                  <span className="text-[11px]">Group</span>
                </button>
              </div>
            </div>

            {/* Short Bio */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Short Bio</label>
              <textarea
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  handleInputChange();
                }}
                maxLength={200}
                rows={2}
                placeholder="Ready for Navratri beats..."
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
              />
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Profile Photo (1 is enough)</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full border-2 border-primary overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-primary hover:bg-muted transition-colors">
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

          <p className="text-center text-xs text-muted-foreground pt-1">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </AuthSplitLayout>
  );
};
