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

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    displayCurrentDate();
    displayDailyQuote();
    displayWordOfTheDay();
    loadTasks();
    updateStreak();
    setupTaskListeners();
});

// Display current date
function displayCurrentDate() {
    const dateElement = document.getElementById('current-date');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    dateElement.textContent = today.toLocaleDateString('en-US', options);
}

// Display daily quote (based on day of year)
function displayDailyQuote() {
    const quoteElement = document.getElementById('daily-quote');
    const authorElement = document.getElementById('quote-author');
    
    const dayOfYear = getDayOfYear();
    const quoteIndex = dayOfYear % stoicQuotes.length;
    const quote = stoicQuotes[quoteIndex];
    
    quoteElement.textContent = quote.text;
    authorElement.textContent = '— ' + quote.author;
}

// Display word of the day (based on day of year)
function displayWordOfTheDay() {
    const wordTitleElement = document.getElementById('word-title');
    const wordDefinitionElement = document.getElementById('word-definition');
    
    const dayOfYear = getDayOfYear();
    const wordIndex = dayOfYear % wordsOfTheDay.length;
    const wordData = wordsOfTheDay[wordIndex];
    
    wordTitleElement.textContent = wordData.word;
    wordDefinitionElement.textContent = wordData.definition;
}

// Get day of year (1-365/366)
function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
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
            saveTasks();
            updateStreak();
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
