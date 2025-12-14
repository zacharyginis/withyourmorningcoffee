// Supabase configuration
const SUPABASE_URL = 'https://mnisrzhclythedpzdsfr.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uaXNyemhjbHl0aGVkcHpkc2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MTc0NzUsImV4cCI6MjA4MTI5MzQ3NX0.4Sy7od6iwF5Zj6YnfjqujF91X2Y4zpR2vKOQfpFANBU'; // Replace with your Supabase anon key

// Current user state
let currentUser = null;
let currentSession = null;

// ==================== AUTH FUNCTIONS ====================

// Initialize auth state
async function initAuth() {
    // Check for existing session
    await checkSession();
    setupAuthUI();
}

// Get access token from storage (localStorage or sessionStorage)
function getAccessToken() {
    return getAccessToken() || 
           sessionStorage.getItem('supabase_access_token') || 
           '';
}

// Check for existing session
async function checkSession() {
    try {
        const token = getAccessToken();
        if (!token) {
            updateUIForLoggedOutUser();
            return;
        }
        
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            currentSession = { access_token: token };
            updateUIForLoggedInUser();
            await loadUserProfile();
        } else {
            currentUser = null;
            currentSession = null;
            // Clear invalid tokens
            localStorage.removeItem('supabase_access_token');
            sessionStorage.removeItem('supabase_access_token');
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Session check error:', error);
        currentUser = null;
        updateUIForLoggedOutUser();
    }
}

// Sign up with email and password
async function signUp(email, password, name) {
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                data: { full_name: name }
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error_description || data.msg || 'Sign up failed');
        }
        
        if (data.access_token) {
            localStorage.setItem('supabase_access_token', data.access_token);
            localStorage.setItem('supabase_refresh_token', data.refresh_token);
            currentUser = data.user;
            currentSession = { access_token: data.access_token };
            
            await createUserProfile(data.user.id, name, email);
            updateUIForLoggedInUser();
            closeAuthModal();
            await loadUserProfile();
        } else {
            // Email confirmation required
            showAuthError('Please check your email to confirm your account!');
        }
        
        return data;
    } catch (error) {
        showAuthError(error.message);
        throw error;
    }
}

// Sign in with email and password
async function signIn(email, password, rememberMe = true) {
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        console.log('Sign in response:', response.status, data);
        
        if (!response.ok) {
            // Handle specific error messages
            let errorMsg = data.error_description || data.msg || data.error || 'Sign in failed';
            if (errorMsg.includes('Invalid login')) {
                errorMsg = 'Invalid email or password. Please try again.';
            } else if (errorMsg.includes('Email not confirmed')) {
                errorMsg = 'Please check your email and confirm your account first.';
            }
            throw new Error(errorMsg);
        }
        
        // Store tokens based on remember me preference
        if (rememberMe) {
            localStorage.setItem('supabase_access_token', data.access_token);
            localStorage.setItem('supabase_refresh_token', data.refresh_token);
            localStorage.setItem('supabase_remember', 'true');
        } else {
            sessionStorage.setItem('supabase_access_token', data.access_token);
            sessionStorage.setItem('supabase_refresh_token', data.refresh_token);
            localStorage.removeItem('supabase_remember');
        }
        
        currentUser = data.user;
        currentSession = { access_token: data.access_token };
        
        updateUIForLoggedInUser();
        closeAuthModal();
        await loadUserProfile();
        
        return data;
    } catch (error) {
        showAuthError(error.message);
        throw error;
    }
}

// Sign out
async function signOut() {
    try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${getAccessToken()}`
            }
        });
    } catch (error) {
        console.error('Sign out error:', error);
    }
    
    // Clear both storage types
    localStorage.removeItem('supabase_access_token');
    localStorage.removeItem('supabase_refresh_token');
    localStorage.removeItem('supabase_remember');
    sessionStorage.removeItem('supabase_access_token');
    sessionStorage.removeItem('supabase_refresh_token');
    currentUser = null;
    currentSession = null;
    userProfile = null;
    
    updateUIForLoggedOutUser();
    loadTasks();
    updateStreak();
}

// Create user profile in database
async function createUserProfile(userId, name, email) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                id: userId,
                full_name: name,
                email: email,
                bio: '',
                daily_goal: '',
                avatar_url: null,
                streak_count: 0,
                longest_streak: 0,
                total_days_completed: 0,
                streak_last_date: null,
                email_reminders: false,
                show_greeting: true,
                show_bible_quote: true,
                created_at: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            console.error('Failed to create user profile');
        }
    } catch (error) {
        console.error('Create profile error:', error);
    }
}

// Load user profile from database
async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${currentUser.id}`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${getAccessToken()}`
                }
            }
        );
        
        if (response.ok) {
            const profiles = await response.json();
            if (profiles.length > 0) {
                userProfile = profiles[0];
                // Update UI with profile data
                updateUIForLoggedInUser();
                // Load user-specific tasks and streak
                await loadUserTasks();
                await loadUserStreak(userProfile);
            }
        }
    } catch (error) {
        console.error('Load profile error:', error);
    }
}

// Load user-specific tasks
async function loadUserTasks() {
    if (!currentUser) return;
    
    try {
        const todayString = getTodayString();
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/user_daily_tasks?user_id=eq.${currentUser.id}&task_date=eq.${todayString}`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${getAccessToken()}`
                }
            }
        );
        
        if (response.ok) {
            const tasks = await response.json();
            if (tasks.length > 0) {
                const taskData = tasks[0];
                const checkboxes = document.querySelectorAll('.task-checkbox');
                checkboxes.forEach(checkbox => {
                    const taskKey = checkbox.id.replace('task-', '');
                    if (taskData[taskKey] !== undefined) {
                        checkbox.checked = taskData[taskKey];
                    }
                });
            } else {
                // No tasks for today, reset all
                const checkboxes = document.querySelectorAll('.task-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
            }
        }
    } catch (error) {
        console.error('Load user tasks error:', error);
    }
}

// Save user tasks to database
async function saveUserTasks() {
    if (!currentUser) {
        saveTasks(); // Fall back to localStorage
        return;
    }
    
    const checkboxes = document.querySelectorAll('.task-checkbox');
    const taskData = {
        user_id: currentUser.id,
        task_date: getTodayString(),
        bible: document.getElementById('task-bible')?.checked || false,
        book: document.getElementById('task-book')?.checked || false,
        hillsdale: document.getElementById('task-hillsdale')?.checked || false,
        ai: document.getElementById('task-ai')?.checked || false,
        word: document.getElementById('task-word')?.checked || false,
        updated_at: new Date().toISOString()
    };
    
    try {
        // Try to upsert (insert or update)
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/user_daily_tasks`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${getAccessToken()}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(taskData)
            }
        );
        
        if (!response.ok) {
            console.error('Failed to save tasks');
        }
        
        // Update streak
        await updateUserStreak();
    } catch (error) {
        console.error('Save tasks error:', error);
    }
}

// Load user streak from profile
async function loadUserStreak(profile) {
    const streakNumberElement = document.getElementById('streak-number');
    const streakInfoElement = document.getElementById('streak-info');
    
    const streakCount = profile.streak_count || 0;
    streakNumberElement.textContent = streakCount;
    
    // Update userProfile with latest data
    if (userProfile) {
        userProfile.streak_count = streakCount;
        userProfile.longest_streak = profile.longest_streak || 0;
        userProfile.total_days_completed = profile.total_days_completed || 0;
    }
    
    if (streakCount > 0) {
        streakInfoElement.textContent = '🔥 Keep your streak alive!';
    } else {
        streakInfoElement.textContent = 'Complete all tasks to start your streak!';
    }
}

// Update user streak in database
async function updateUserStreak() {
    if (!currentUser) {
        updateStreak();
        return;
    }
    
    const checkboxes = document.querySelectorAll('.task-checkbox');
    const allCompleted = Array.from(checkboxes).every(cb => cb.checked);
    
    console.log('Updating streak, all completed:', allCompleted);
    
    if (!allCompleted) {
        const remaining = getRemainingTasksCount();
        document.getElementById('streak-info').textContent = 
            `Complete ${remaining} more task${remaining > 1 ? 's' : ''} to maintain your streak!`;
        return;
    }
    
    // All tasks completed - update streak
    try {
        const todayString = getTodayString();
        console.log('Today string:', todayString);
        
        // Get current profile
        const profileRes = await fetch(
            `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${currentUser.id}`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${getAccessToken()}`
                }
            }
        );
        
        if (!profileRes.ok) {
            console.error('Failed to fetch profile for streak update');
            return;
        }
        
        const profiles = await profileRes.json();
        console.log('Profile data:', profiles);
        
        if (profiles.length === 0) {
            console.error('No profile found');
            return;
        }
        
        const profile = profiles[0];
        let newStreak = profile.streak_count || 0;
        let longestStreak = profile.longest_streak || 0;
        let totalDays = profile.total_days_completed || 0;
        
        console.log('Current streak:', newStreak, 'Last date:', profile.streak_last_date);
        
        // Check if already counted today
        if (profile.streak_last_date === todayString) {
            console.log('Already counted today');
            document.getElementById('streak-number').textContent = newStreak;
            document.getElementById('streak-info').textContent = '🎉 Amazing! Keep up the great work!';
            return;
        }
        
        // Check if yesterday was completed (streak continues)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];
        
        console.log('Yesterday string:', yesterdayString);
        
        if (profile.streak_last_date === yesterdayString) {
            // Streak continues
            newStreak++;
            console.log('Streak continues, new streak:', newStreak);
        } else if (!profile.streak_last_date) {
            // First time ever
            newStreak = 1;
            console.log('First streak day');
        } else {
            // Streak broken, start fresh
            newStreak = 1;
            console.log('Streak reset to 1');
        }
        
        // Update total days
        totalDays++;
        
        // Update longest streak if needed
        if (newStreak > longestStreak) {
            longestStreak = newStreak;
        }
        
        // Update profile in database
        const updateData = {
            streak_count: newStreak,
            streak_last_date: todayString,
            longest_streak: longestStreak,
            total_days_completed: totalDays
        };
        
        console.log('Updating profile with:', updateData);
        
        const updateRes = await fetch(
            `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${currentUser.id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${getAccessToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            }
        );
        
        console.log('Update response status:', updateRes.status);
        
        if (updateRes.ok) {
            // Update local state
            if (userProfile) {
                userProfile.streak_count = newStreak;
                userProfile.longest_streak = longestStreak;
                userProfile.total_days_completed = totalDays;
                userProfile.streak_last_date = todayString;
            }
            
            document.getElementById('streak-number').textContent = newStreak;
            document.getElementById('streak-info').textContent = '🎉 Amazing! Keep up the great work!';
        } else {
            const errorText = await updateRes.text();
            console.error('Failed to update streak:', errorText);
        }
    } catch (error) {
        console.error('Update streak error:', error);
    }
}

// ==================== AUTH UI FUNCTIONS ====================

let isSignUpMode = false;

function setupAuthUI() {
    const modal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('auth-close');
    const signInBtn = document.getElementById('sign-in-btn');
    const authForm = document.getElementById('auth-form');
    const switchBtn = document.getElementById('auth-switch-btn');
    
    // Open modal
    signInBtn?.addEventListener('click', () => openAuthModal());
    
    // Close modal
    closeBtn?.addEventListener('click', () => closeAuthModal());
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeAuthModal();
    });
    
    // Switch between sign in and sign up
    switchBtn?.addEventListener('click', toggleAuthMode);
    
    // Handle form submit
    authForm?.addEventListener('submit', handleAuthSubmit);
}

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal?.classList.add('active');
    document.getElementById('auth-error').textContent = '';
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal?.classList.remove('active');
    document.getElementById('auth-form')?.reset();
    document.getElementById('auth-error').textContent = '';
}

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('auth-submit');
    const switchText = document.getElementById('auth-switch-text');
    const switchBtn = document.getElementById('auth-switch-btn');
    const nameGroup = document.getElementById('name-group');
    
    if (isSignUpMode) {
        title.textContent = 'Create Account';
        subtitle.textContent = 'Start your journey today';
        submitBtn.textContent = 'Sign Up';
        switchText.textContent = 'Already have an account?';
        switchBtn.textContent = 'Sign In';
        nameGroup.style.display = 'flex';
    } else {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Sign in to your account';
        submitBtn.textContent = 'Sign In';
        switchText.textContent = "Don't have an account?";
        switchBtn.textContent = 'Sign Up';
        nameGroup.style.display = 'none';
    }
    
    document.getElementById('auth-error').textContent = '';
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name')?.value || '';
    const rememberMe = document.getElementById('auth-remember')?.checked ?? true;
    
    const submitBtn = document.getElementById('auth-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = isSignUpMode ? 'Creating account...' : 'Signing in...';
    
    try {
        if (isSignUpMode) {
            await signUp(email, password, name);
        } else {
            await signIn(email, password, rememberMe);
        }
    } catch (error) {
        // Error already shown
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    }
}

function showAuthError(message) {
    document.getElementById('auth-error').textContent = message;
}

// Current user profile data
let userProfile = null;

function updateUIForLoggedInUser() {
    const userMenu = document.getElementById('user-menu');
    const greeting = document.getElementById('user-greeting');
    
    const name = userProfile?.full_name || 
                 currentUser?.user_metadata?.full_name || 
                 currentUser?.email?.split('@')[0] || 
                 'Friend';
    const initial = name.charAt(0).toUpperCase();
    
    // Check if user has a profile picture
    const hasProfilePic = userProfile?.avatar_url;
    const avatarContent = hasProfilePic 
        ? `<img src="${userProfile.avatar_url}" alt="${name}">`
        : `<span>${initial}</span>`;
    
    userMenu.innerHTML = `
        <div class="user-avatar" id="user-avatar">
            ${avatarContent}
        </div>
        <div class="user-dropdown" id="user-dropdown">
            <div class="user-dropdown-header">
                <div class="user-dropdown-name">${name}</div>
                <div class="user-dropdown-email">${currentUser?.email || ''}</div>
            </div>
            <button class="user-dropdown-btn" id="open-profile-btn">⚙️ Profile Settings</button>
            <button class="user-dropdown-btn sign-out" id="sign-out-btn">Sign Out</button>
        </div>
    `;
    
    // Show personalized greeting
    const greetingText = userProfile?.daily_goal 
        ? `Good ${getTimeOfDay()}, ${name}! "${userProfile.daily_goal}"`
        : `Good ${getTimeOfDay()}, ${name}! ☀️`;
    greeting.textContent = greetingText;
    greeting.classList.remove('hidden');
    
    // Apply user preferences
    applyUserPreferences();
    
    // Setup dropdown toggle
    const avatar = document.getElementById('user-avatar');
    const dropdown = document.getElementById('user-dropdown');
    
    avatar?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown?.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdown?.classList.remove('active');
    });
    
    // Profile button
    document.getElementById('open-profile-btn')?.addEventListener('click', () => {
        dropdown?.classList.remove('active');
        openProfileModal();
    });
    
    // Sign out button
    document.getElementById('sign-out-btn')?.addEventListener('click', signOut);
}

// Apply user preferences from profile
function applyUserPreferences() {
    if (!userProfile) return;
    
    // Bible quote visibility
    const bibleQuoteBox = document.getElementById('bible-quote-box');
    if (bibleQuoteBox) {
        bibleQuoteBox.style.display = userProfile.show_bible_quote === false ? 'none' : 'block';
    }
    
    // Greeting visibility
    const greeting = document.getElementById('user-greeting');
    if (greeting && userProfile.show_greeting === false) {
        greeting.classList.add('hidden');
    }
}

// ==================== PROFILE MODAL ====================

function setupProfileModal() {
    const modal = document.getElementById('profile-modal');
    const closeBtn = document.getElementById('profile-close');
    const form = document.getElementById('profile-form');
    const pictureInput = document.getElementById('profile-picture-input');
    
    closeBtn?.addEventListener('click', closeProfileModal);
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeProfileModal();
    });
    
    form?.addEventListener('submit', handleProfileSave);
    pictureInput?.addEventListener('change', handleProfilePictureUpload);
}

function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    modal?.classList.add('active');
    populateProfileModal();
}

function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    modal?.classList.remove('active');
    document.getElementById('profile-success')?.classList.add('hidden');
}

function populateProfileModal() {
    if (!currentUser) return;
    
    const name = userProfile?.full_name || currentUser?.user_metadata?.full_name || '';
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    
    // Set form values
    document.getElementById('profile-name').value = name;
    document.getElementById('profile-email').value = currentUser?.email || '';
    document.getElementById('profile-bio').value = userProfile?.bio || '';
    document.getElementById('profile-goal').value = userProfile?.daily_goal || '';
    
    // Set profile picture
    const profilePic = document.getElementById('profile-picture');
    const profileInitial = document.getElementById('profile-initial');
    const profileImage = document.getElementById('profile-image');
    
    if (userProfile?.avatar_url) {
        profileInitial.style.display = 'none';
        profileImage.src = userProfile.avatar_url;
        profileImage.style.display = 'block';
    } else {
        profileInitial.textContent = initial;
        profileInitial.style.display = 'block';
        profileImage.style.display = 'none';
    }
    
    // Set preferences
    document.getElementById('pref-reminders').checked = userProfile?.email_reminders || false;
    document.getElementById('pref-greeting').checked = userProfile?.show_greeting !== false;
    document.getElementById('pref-bible-quote').checked = userProfile?.show_bible_quote !== false;
    
    // Set stats
    document.getElementById('stat-streak').textContent = userProfile?.streak_count || 0;
    document.getElementById('stat-total-days').textContent = userProfile?.total_days_completed || 0;
    document.getElementById('stat-longest').textContent = userProfile?.longest_streak || 0;
    
    // Set member since
    if (userProfile?.created_at) {
        const date = new Date(userProfile.created_at);
        document.getElementById('profile-member-since').textContent = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

async function handleProfilePictureUpload(e) {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = function(event) {
        const profileInitial = document.getElementById('profile-initial');
        const profileImage = document.getElementById('profile-image');
        profileInitial.style.display = 'none';
        profileImage.src = event.target.result;
        profileImage.style.display = 'block';
    };
    reader.readAsDataURL(file);
    
    // Upload to Supabase Storage
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}/avatar.${fileExt}`;
        
        // Use upsert to overwrite existing avatar
        const uploadResponse = await fetch(
            `${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
            {
                method: 'PUT',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${getAccessToken()}`,
                    'Content-Type': file.type,
                    'x-upsert': 'true'
                },
                body: file
            }
        );
        
        console.log('Upload response:', uploadResponse.status, await uploadResponse.text());
        
        if (uploadResponse.ok || uploadResponse.status === 200) {
            // Get public URL
            const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}?t=${Date.now()}`;
            
            // Update profile with new avatar URL
            const updateResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${currentUser.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${getAccessToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ avatar_url: avatarUrl })
                }
            );
            
            console.log('Profile update response:', updateResponse.status);
            
            if (updateResponse.ok) {
                userProfile.avatar_url = avatarUrl;
                updateUIForLoggedInUser();
            }
        } else {
            console.error('Upload failed:', uploadResponse.status);
            alert('Failed to upload image. Make sure the "avatars" storage bucket exists in Supabase.');
        }
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        alert('Error uploading image: ' + error.message);
    }
}

async function handleProfileSave(e) {
    e.preventDefault();
    if (!currentUser) return;
    
    const saveBtn = document.querySelector('.profile-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    const profileData = {
        full_name: document.getElementById('profile-name').value,
        bio: document.getElementById('profile-bio').value,
        daily_goal: document.getElementById('profile-goal').value,
        email_reminders: document.getElementById('pref-reminders').checked,
        show_greeting: document.getElementById('pref-greeting').checked,
        show_bible_quote: document.getElementById('pref-bible-quote').checked,
        updated_at: new Date().toISOString()
    };
    
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${currentUser.id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${getAccessToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            }
        );
        
        if (response.ok) {
            // Update local profile
            userProfile = { ...userProfile, ...profileData };
            updateUIForLoggedInUser();
            
            // Show success message
            document.getElementById('profile-success').classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('profile-success').classList.add('hidden');
            }, 3000);
        }
    } catch (error) {
        console.error('Error saving profile:', error);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

function updateUIForLoggedOutUser() {
    const userMenu = document.getElementById('user-menu');
    const greeting = document.getElementById('user-greeting');
    
    userMenu.innerHTML = `<button class="auth-btn" id="sign-in-btn">Sign In</button>`;
    greeting.classList.add('hidden');
    
    // Re-setup auth UI
    document.getElementById('sign-in-btn')?.addEventListener('click', () => openAuthModal());
}

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}

// ==================== BIBLE QUOTE ====================

// Fetch and display Bible quote from Supabase
async function loadBibleQuote() {
    const quoteText = document.getElementById('bible-quote-text');
    const quoteReference = document.getElementById('bible-quote-reference');
    
    try {
        const dayOfYear = getDayOfYear(getViewingDate());
        
        // First get total count
        const countResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/biblequotes?select=id`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!countResponse.ok) throw new Error('Failed to fetch quote count');
        
        const allQuotes = await countResponse.json();
        const totalQuotes = allQuotes.length;
        
        if (totalQuotes === 0) {
            quoteText.textContent = 'No quotes available';
            return;
        }
        
        // Get quote based on day of year
        const quoteIndex = dayOfYear % totalQuotes;
        const selectedQuoteId = allQuotes[quoteIndex].id;
        
        const quoteResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/biblequotes?id=eq.${selectedQuoteId}`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!quoteResponse.ok) throw new Error('Failed to fetch quote');
        
        const quoteData = await quoteResponse.json();
        
        if (quoteData.length > 0) {
            const quote = quoteData[0];
            quoteText.textContent = `"${quote.quote || quote.text || quote.content}"`;
            quoteReference.textContent = quote.reference || quote.verse || quote.source || '';
        }
    } catch (error) {
        console.error('Error loading Bible quote:', error);
        // Fallback quote
        quoteText.textContent = '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."';
        quoteReference.textContent = 'Jeremiah 29:11';
    }
}

// Stoic philosophy quotes
const stoicQuotes = [
    {
        text: "You have power over your mind - not outside events. Realize this, and you will find strength.",
        author: "Marcus Aurelius"
    },
    {
        text: "It's not what happens to you, but how you react to it that matters.",
        author: "Epictetus"
    },
    {
        text: "Wealth consists not in having great possessions, but in having few wants.",
        author: "Epictetus"
    },
    {
        text: "The happiness of your life depends upon the quality of your thoughts.",
        author: "Marcus Aurelius"
    },
    {
        text: "We suffer more often in imagination than in reality.",
        author: "Seneca"
    },
    {
        text: "He who is brave is free.",
        author: "Seneca"
    },
    {
        text: "Difficulties strengthen the mind, as labor does the body.",
        author: "Seneca"
    },
    {
        text: "The unexamined life is not worth living.",
        author: "Socrates"
    },
    {
        text: "Know thyself.",
        author: "Socrates"
    },
    {
        text: "The only true wisdom is in knowing you know nothing.",
        author: "Socrates"
    },
    {
        text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
        author: "Aristotle"
    },
    {
        text: "It is the mark of an educated mind to be able to entertain a thought without accepting it.",
        author: "Aristotle"
    },
    {
        text: "Patience is bitter, but its fruit is sweet.",
        author: "Aristotle"
    },
    {
        text: "The beginning is the most important part of the work.",
        author: "Plato"
    },
    {
        text: "Wise men speak because they have something to say; fools because they have to say something.",
        author: "Plato"
    },
    {
        text: "The greatest wealth is to live content with little.",
        author: "Plato"
    },
    {
        text: "If it is not right, do not do it. If it is not true, do not say it.",
        author: "Marcus Aurelius"
    },
    {
        text: "Waste no more time arguing what a good man should be. Be one.",
        author: "Marcus Aurelius"
    },
    {
        text: "First say to yourself what you would be; and then do what you have to do.",
        author: "Epictetus"
    },
    {
        text: "Luck is what happens when preparation meets opportunity.",
        author: "Seneca"
    }
];

// Words of the day
const wordsOfTheDay = [
    {
        word: "Eudaimonia",
        definition: "A state of human flourishing or well-being; the highest human good in ancient Greek philosophy."
    },
    {
        word: "Ataraxia",
        definition: "A state of serene calmness and freedom from emotional disturbance and anxiety."
    },
    {
        word: "Virtue",
        definition: "Moral excellence; behavior showing high moral standards; the quality of being morally good."
    },
    {
        word: "Temperance",
        definition: "Moderation in action, thought, or feeling; self-restraint and control over one's desires."
    },
    {
        word: "Prudence",
        definition: "The ability to govern oneself through the use of reason; good judgment in practical affairs."
    },
    {
        word: "Fortitude",
        definition: "Courage in pain or adversity; mental and emotional strength in facing difficulty."
    },
    {
        word: "Sagacity",
        definition: "The quality of being sage, wise, or able to make good judgments; wisdom."
    },
    {
        word: "Equanimity",
        definition: "Mental calmness, composure, and evenness of temper, especially in difficult situations."
    },
    {
        word: "Magnanimity",
        definition: "Generosity in forgiving an insult or injury; nobility of spirit; greatness of mind."
    },
    {
        word: "Perseverance",
        definition: "Continued effort to do or achieve something despite difficulties, failure, or opposition."
    },
    {
        word: "Diligence",
        definition: "Careful and persistent work or effort; conscientiousness in one's work or duties."
    },
    {
        word: "Integrity",
        definition: "The quality of being honest and having strong moral principles; moral uprightness."
    },
    {
        word: "Stoicism",
        definition: "Endurance of pain or hardship without display of feelings and without complaint."
    },
    {
        word: "Resilience",
        definition: "The capacity to recover quickly from difficulties; toughness and adaptability."
    },
    {
        word: "Contemplation",
        definition: "Deep reflective thought; the action of looking thoughtfully at something for a long time."
    }
];

// Current viewing date (offset from today)
let dateOffset = 0;

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    await initAuth();
    loadAllContent();
    if (!currentUser) {
        loadTasks();
        updateStreak();
    }
    setupTaskListeners();
    setupWordReveal();
    setupDateNavigation();
    setupProfileModal();
});

// Load all date-dependent content
function loadAllContent() {
    displayCurrentDate();
    displayDailyQuote();
    displayWordOfTheDay();
    loadDailyLearnings();
    loadBibleQuote();
    resetWordReveal();
}

// Setup date navigation buttons
function setupDateNavigation() {
    const prevBtn = document.getElementById('prev-day');
    const nextBtn = document.getElementById('next-day');
    
    prevBtn.addEventListener('click', function() {
        dateOffset--;
        loadAllContent();
        updateNextButtonState();
    });
    
    nextBtn.addEventListener('click', function() {
        if (dateOffset < 0) {
            dateOffset++;
            loadAllContent();
        }
        updateNextButtonState();
    });
    
    updateNextButtonState();
}

// Update next button state (disable if viewing today)
function updateNextButtonState() {
    const nextBtn = document.getElementById('next-day');
    if (dateOffset >= 0) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.5';
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
    }
}

// Reset word reveal state when changing dates
function resetWordReveal() {
    const revealBtn = document.getElementById('reveal-definition');
    const definitionElement = document.getElementById('word-definition');
    const guessInput = document.getElementById('word-guess');
    
    definitionElement.classList.add('hidden');
    revealBtn.textContent = 'Reveal Definition';
    revealBtn.disabled = false;
    revealBtn.style.opacity = '1';
    guessInput.value = '';
}

// Get the current viewing date
function getViewingDate() {
    const date = new Date();
    date.setDate(date.getDate() + dateOffset);
    return date;
}

// Display current date
function displayCurrentDate() {
    const dateElement = document.getElementById('current-date');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const viewingDate = getViewingDate();
    dateElement.textContent = viewingDate.toLocaleDateString('en-US', options);
}

// Display daily quote (based on day of year)
function displayDailyQuote() {
    const quoteElement = document.getElementById('daily-quote');
    const authorElement = document.getElementById('quote-author');
    
    const dayOfYear = getDayOfYear(getViewingDate());
    const quoteIndex = dayOfYear % stoicQuotes.length;
    const quote = stoicQuotes[quoteIndex];
    
    quoteElement.textContent = quote.text;
    authorElement.textContent = '— ' + quote.author;
}

// Display word of the day from Supabase
async function displayWordOfTheDay() {
    const wordTitleElement = document.getElementById('word-title');
    const wordPartOfSpeechElement = document.getElementById('word-part-of-speech');
    const wordDefinitionElement = document.getElementById('word-definition');
    
    try {
        // Fetch a random word from the word_of_the_day table based on day of year
        const dayOfYear = getDayOfYear(getViewingDate());
        
        // First get total count
        const countResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/word_of_the_day?select=id`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!countResponse.ok) throw new Error('Failed to fetch word count');
        
        const allWords = await countResponse.json();
        const totalWords = allWords.length;
        
        if (totalWords === 0) {
            wordTitleElement.textContent = 'No words available';
            return;
        }
        
        // Get word based on day of year
        const wordIndex = dayOfYear % totalWords;
        const selectedWordId = allWords[wordIndex].id;
        
        const wordResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/word_of_the_day?id=eq.${selectedWordId}`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!wordResponse.ok) throw new Error('Failed to fetch word');
        
        const wordData = await wordResponse.json();
        
        if (wordData.length > 0) {
            const word = wordData[0];
            wordTitleElement.textContent = word.word;
            wordPartOfSpeechElement.textContent = word.part_of_speech || '';
            wordDefinitionElement.textContent = word.definition;
        }
    } catch (error) {
        console.error('Error loading word of the day:', error);
        // Fallback to local words
        const dayOfYear = getDayOfYear(getViewingDate());
        const wordIndex = dayOfYear % wordsOfTheDay.length;
        const wordData = wordsOfTheDay[wordIndex];
        
        wordTitleElement.textContent = wordData.word;
        wordPartOfSpeechElement.textContent = '';
        wordDefinitionElement.textContent = wordData.definition;
    }
}

// Setup reveal button for word definition
function setupWordReveal() {
    const revealBtn = document.getElementById('reveal-definition');
    const definitionElement = document.getElementById('word-definition');
    const guessInput = document.getElementById('word-guess');
    
    revealBtn.addEventListener('click', function() {
        definitionElement.classList.remove('hidden');
        revealBtn.textContent = 'Definition Revealed!';
        revealBtn.disabled = true;
        revealBtn.style.opacity = '0.7';
    });
}

// Get day of year (1-365/366)
function getDayOfYear(date) {
    const targetDate = date || new Date();
    const start = new Date(targetDate.getFullYear(), 0, 0);
    const diff = targetDate - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

// Fetch data from Supabase
async function fetchFromSupabase(table) {
    const viewingDate = getViewingDate().toISOString().split('T')[0];
    
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?date_added=eq.${viewingDate}&limit=1`,
        {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        }
    );
    
    if (!response.ok) {
        throw new Error(`Failed to fetch from ${table}`);
    }
    
    const data = await response.json();
    
    // If no data for the viewing date, get the most recent entry before or on that date
    if (data.length === 0) {
        const fallbackResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/${table}?date_added=lte.${viewingDate}&order=date_added.desc&limit=1`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!fallbackResponse.ok) {
            throw new Error(`Failed to fetch from ${table}`);
        }
        
        return await fallbackResponse.json();
    }
    
    return data;
}

// Load daily learnings from Supabase
async function loadDailyLearnings() {
    // Load History Learning
    try {
        const historyData = await fetchFromSupabase('history_learnings');
        if (historyData.length > 0) {
            document.getElementById('history-title').textContent = historyData[0].title;
            document.getElementById('history-content').textContent = historyData[0].content;
            document.getElementById('history-source').textContent = historyData[0].source ? `Source: ${historyData[0].source}` : '';
        } else {
            document.getElementById('history-title').textContent = 'No history learning available';
            document.getElementById('history-content').textContent = '';
        }
    } catch (error) {
        console.error('Error loading history learning:', error);
        document.getElementById('history-title').textContent = 'Failed to load';
        document.getElementById('history-content').textContent = 'Please check your Supabase configuration.';
    }

    // Load Religion Learning
    try {
        const religionData = await fetchFromSupabase('religion_learnings');
        if (religionData.length > 0) {
            document.getElementById('religion-title').textContent = religionData[0].title;
            document.getElementById('religion-content').textContent = religionData[0].content;
            document.getElementById('religion-source').textContent = religionData[0].source ? `Source: ${religionData[0].source}` : '';
        } else {
            document.getElementById('religion-title').textContent = 'No religion learning available';
            document.getElementById('religion-content').textContent = '';
        }
    } catch (error) {
        console.error('Error loading religion learning:', error);
        document.getElementById('religion-title').textContent = 'Failed to load';
        document.getElementById('religion-content').textContent = 'Please check your Supabase configuration.';
    }

    // Load Economics Learning
    try {
        const economicsData = await fetchFromSupabase('economics_learnings');
        if (economicsData.length > 0) {
            document.getElementById('economics-title').textContent = economicsData[0].title;
            document.getElementById('economics-content').textContent = economicsData[0].content;
            document.getElementById('economics-source').textContent = economicsData[0].source ? `Source: ${economicsData[0].source}` : '';
        } else {
            document.getElementById('economics-title').textContent = 'No economics learning available';
            document.getElementById('economics-content').textContent = '';
        }
    } catch (error) {
        console.error('Error loading economics learning:', error);
        document.getElementById('economics-title').textContent = 'Failed to load';
        document.getElementById('economics-content').textContent = 'Please check your Supabase configuration.';
    }
}

// Get today's date string (YYYY-MM-DD)
function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Setup task checkbox listeners
function setupTaskListeners() {
    const checkboxes = document.querySelectorAll('.task-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (currentUser) {
                saveUserTasks();
            } else {
                saveTasks();
                updateStreak();
            }
        });
    });
}

// Load tasks from localStorage
function loadTasks() {
    const todayString = getTodayString();
    const savedData = localStorage.getItem('morningCoffeeTasks');
    
    if (savedData) {
        const data = JSON.parse(savedData);
        
        // If it's a new day, reset all tasks
        if (data.date !== todayString) {
            // Check if all tasks were completed yesterday
            if (data.date && allTasksCompleted(data.tasks)) {
                // User completed all tasks yesterday
                console.log('All tasks completed yesterday');
            } else if (data.date) {
                // User didn't complete all tasks yesterday - reset streak
                localStorage.removeItem('morningCoffeeStreak');
            }
            
            // Reset all checkboxes for the new day
            const checkboxes = document.querySelectorAll('.task-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            
            saveTasks(); // Save the new day's data
        } else {
            // Same day, restore saved state
            const checkboxes = document.querySelectorAll('.task-checkbox');
            checkboxes.forEach(checkbox => {
                if (data.tasks[checkbox.id] !== undefined) {
                    checkbox.checked = data.tasks[checkbox.id];
                }
            });
        }
    }
}

// Save tasks to localStorage
function saveTasks() {
    const checkboxes = document.querySelectorAll('.task-checkbox');
    const tasks = {};
    
    checkboxes.forEach(checkbox => {
        tasks[checkbox.id] = checkbox.checked;
    });
    
    const data = {
        date: getTodayString(),
        tasks: tasks
    };
    
    localStorage.setItem('morningCoffeeTasks', JSON.stringify(data));
}

// Check if all tasks are completed
function allTasksCompleted(tasks) {
    return Object.values(tasks).every(completed => completed === true);
}

// Update streak display
function updateStreak() {
    const streakNumberElement = document.getElementById('streak-number');
    const streakInfoElement = document.getElementById('streak-info');
    
    const savedData = localStorage.getItem('morningCoffeeTasks');
    
    if (!savedData) {
        streakNumberElement.textContent = '0';
        streakInfoElement.textContent = 'Complete all tasks to start your streak!';
        return;
    }
    
    const data = JSON.parse(savedData);
    const todayString = getTodayString();
    
    // Check if all tasks are completed today
    if (data.date === todayString && allTasksCompleted(data.tasks)) {
        // All tasks completed today!
        let streakData = localStorage.getItem('morningCoffeeStreak');
        
        if (streakData) {
            streakData = JSON.parse(streakData);
            
            // Check if we already counted today
            if (streakData.lastCompletedDate !== todayString) {
                // Check if yesterday was completed (streak continues)
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayString = yesterday.toISOString().split('T')[0];
                
                if (streakData.lastCompletedDate === yesterdayString) {
                    // Streak continues
                    streakData.count++;
                } else {
                    // Streak broken, start new streak
                    streakData.count = 1;
                }
                
                streakData.lastCompletedDate = todayString;
                localStorage.setItem('morningCoffeeStreak', JSON.stringify(streakData));
            }
        } else {
            // First time completing all tasks
            streakData = {
                count: 1,
                lastCompletedDate: todayString
            };
            localStorage.setItem('morningCoffeeStreak', JSON.stringify(streakData));
        }
        
        streakNumberElement.textContent = streakData.count;
        streakInfoElement.textContent = '🎉 Amazing! Keep up the great work!';
    } else {
        // Not all tasks completed yet
        const streakData = localStorage.getItem('morningCoffeeStreak');
        
        if (streakData) {
            const streak = JSON.parse(streakData);
            streakNumberElement.textContent = streak.count;
            
            const remaining = getRemainingTasksCount();
            if (remaining > 0) {
                streakInfoElement.textContent = `Complete ${remaining} more task${remaining > 1 ? 's' : ''} to maintain your streak!`;
            }
        } else {
            streakNumberElement.textContent = '0';
            streakInfoElement.textContent = 'Complete all tasks to start your streak!';
        }
    }
}

// Get count of remaining uncompleted tasks
function getRemainingTasksCount() {
    const checkboxes = document.querySelectorAll('.task-checkbox');
    let remaining = 0;
    
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            remaining++;
        }
    });
    
    return remaining;
}
