// Daily quote pool. Stable per calendar day so it doesn't shuffle on refresh.
// Curated from goodreads.com/quotes/tag/{inspiration,motivational,wisdom,perseverance,life,discipline,stoicism}
// plus a hand-picked seed set. Long/off-tone quotes filtered; per-author share capped.

const QUOTES: { text: string; by: string }[] = [
  // Action & discipline
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", by: "Will Durant" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", by: "James Clear" },
  { text: "Discipline is choosing between what you want now and what you want most.", by: "Abraham Lincoln" },
  { text: "First we make our habits, then our habits make us.", by: "John Dryden" },
  { text: "The chains of habit are too light to be felt until they are too heavy to be broken.", by: "Warren Buffett" },
  { text: "What you do every day matters more than what you do once in a while.", by: "Gretchen Rubin" },
  { text: "Don't count the days. Make the days count.", by: "Muhammad Ali" },
  { text: "Discipline equals freedom.", by: "Jocko Willink" },
  { text: "Action is the antidote to despair.", by: "Joan Baez" },
  { text: "How we spend our days is, of course, how we spend our lives.", by: "Annie Dillard" },
  { text: "Do what you can, with what you have, where you are.", by: "Theodore Roosevelt" },
  { text: "The journey of a thousand miles begins with one step.", by: "Lao Tzu" },
  { text: "Showing up is half the battle.", by: "Anonymous" },
  { text: "Done is better than perfect.", by: "Sheryl Sandberg" },
  { text: "Energy and persistence conquer all things.", by: "Benjamin Franklin" },
  { text: "Be so good they can't ignore you.", by: "Steve Martin" },
  { text: "Quality is not an act, it is a habit.", by: "Aristotle" },
  { text: "Self-respect is the root of discipline.", by: "Abraham Joshua Heschel" },
  { text: "Self-control is the chief element in self-respect, and self-respect is the chief element in courage.", by: "Thucydides" },
  { text: "You will never have a greater dominion than that over yourself.", by: "Leonardo da Vinci" },
  { text: "Discipline teaches us to operate by principle rather than desire.", by: "John MacArthur" },
  { text: "A disciplined mind leads to happiness, and an undisciplined mind leads to suffering.", by: "Dalai Lama XIV" },
  { text: "Discipline yourself and others won't need to.", by: "John Wooden" },
  { text: "If you only write when inspired, you may be a decent poet, but you'll never be a novelist.", by: "Neil Gaiman" },
  { text: "True freedom is impossible without a mind made free by discipline.", by: "Mortimer J. Adler" },
  { text: "Action will delineate and define you.", by: "Thomas Jefferson" },

  // Perseverance
  { text: "It does not matter how slowly you go as long as you do not stop.", by: "Confucius" },
  { text: "The best way out is always through.", by: "Robert Frost" },
  { text: "If you're going through hell, keep going.", by: "Winston Churchill" },
  { text: "Never, never, never give in.", by: "Winston Churchill" },
  { text: "Continuous effort — not strength or intelligence — is the key to unlocking our potential.", by: "Winston Churchill" },
  { text: "Ever tried. Ever failed. No matter. Try again. Fail again. Fail better.", by: "Samuel Beckett" },
  { text: "I am a slow walker, but I never walk back.", by: "Abraham Lincoln" },
  { text: "Always bear in mind that your own resolution to succeed is more important than any one thing.", by: "Abraham Lincoln" },
  { text: "When things go wrong, don't go with them.", by: "Elvis Presley" },
  { text: "You may encounter many defeats, but you must not be defeated.", by: "Maya Angelou" },
  { text: "Many of life's failures are people who did not realize how close they were to success.", by: "Thomas Edison" },
  { text: "Never confuse a single defeat with a final defeat.", by: "F. Scott Fitzgerald" },
  { text: "If you fell down yesterday, stand up today.", by: "H.G. Wells" },
  { text: "The difference between a successful person and others is not strength or knowledge, but will.", by: "Vince Lombardi" },
  { text: "Dripping water hollows out stone, not through force but through persistence.", by: "Ovid" },
  { text: "A wise man will make more opportunities than he finds.", by: "Francis Bacon" },
  { text: "Even if I knew that tomorrow the world would go to pieces, I would still plant my apple tree.", by: "Martin Luther" },
  { text: "Sometimes even to live is an act of courage.", by: "Seneca" },
  { text: "Rivers know this: there is no hurry. We shall get there some day.", by: "A.A. Milne" },
  { text: "The brick walls are there to give us a chance to show how badly we want something.", by: "Randy Pausch" },
  { text: "Pain is temporary. Quitting lasts forever.", by: "Lance Armstrong" },
  { text: "It's not the load that breaks you down, it's the way you carry it.", by: "Lou Holtz" },

  // Stoic & inner stance
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", by: "Marcus Aurelius" },
  { text: "If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it.", by: "Marcus Aurelius" },
  { text: "The things you think about determine the quality of your mind.", by: "Marcus Aurelius" },
  { text: "Never let the future disturb you. You will meet it with the same weapons of reason which today arm you.", by: "Marcus Aurelius" },
  { text: "The obstacle is the way.", by: "Marcus Aurelius" },
  { text: "Waste no more time arguing what a good person should be. Be one.", by: "Marcus Aurelius" },
  { text: "Misfortune nobly born is good fortune.", by: "Marcus Aurelius" },
  { text: "We suffer more often in imagination than in reality.", by: "Seneca" },
  { text: "Until we have begun to go without them, we fail to realize how unnecessary many things are.", by: "Seneca" },
  { text: "Nothing is burdensome if taken lightly.", by: "Seneca" },
  { text: "It is the power of the mind to be unconquerable.", by: "Seneca" },
  { text: "To be everywhere is to be nowhere.", by: "Seneca" },
  { text: "What really frightens and dismays us is not external events themselves, but the way we think about them.", by: "Epictetus" },
  { text: "It is not enough to be hit or insulted to be harmed; you must believe that you are being harmed.", by: "Epictetus" },
  { text: "Everything can be taken from a man but one thing: the last of the human freedoms — to choose one's attitude.", by: "Viktor E. Frankl" },
  { text: "A Stoic is someone who transforms fear into prudence, pain into transformation, mistakes into initiation.", by: "Nassim Nicholas Taleb" },
  { text: "Be patient with yourself. Self-growth is tender; it's holy ground.", by: "Stephen Covey" },

  // Self & growth
  { text: "It is never too late to be what you might have been.", by: "George Eliot" },
  { text: "You are the sky. Everything else is just the weather.", by: "Pema Chödrön" },
  { text: "Knowing yourself is the beginning of all wisdom.", by: "Aristotle" },
  { text: "The unexamined life is not worth living.", by: "Socrates" },
  { text: "The only true wisdom is in knowing you know nothing.", by: "Socrates" },
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", by: "Rumi" },
  { text: "The wound is the place where the light enters you.", by: "Rumi" },
  { text: "Turn your wounds into wisdom.", by: "Oprah Winfrey" },
  { text: "By three methods we may learn wisdom: First, by reflection, which is noblest; Second, by imitation, which is easiest; and third by experience, which is the bitterest.", by: "Confucius" },
  { text: "The secret of life is to fall seven times and to get up eight times.", by: "Paulo Coelho" },
  { text: "The simple things are also the most extraordinary things, and only the wise can see them.", by: "Paulo Coelho" },
  { text: "Begin again. Always begin again.", by: "Anne Lamott" },
  { text: "Tomorrow is fresh, with no mistakes in it yet.", by: "L.M. Montgomery" },
  { text: "Life isn't about finding yourself. Life is about creating yourself.", by: "George Bernard Shaw" },
  { text: "Any fool can know. The point is to understand.", by: "Albert Einstein" },
  { text: "Life is like riding a bicycle. To keep your balance, you must keep moving.", by: "Albert Einstein" },
  { text: "There are only two ways to live your life. One is as though nothing is a miracle. The other is as though everything is a miracle.", by: "Albert Einstein" },
  { text: "Think before you speak. Read before you think.", by: "Fran Lebowitz" },
  { text: "You do not write your life with words. You write it with actions.", by: "Patrick Ness" },
  { text: "Hard things are hard. Do them anyway.", by: "Anonymous" },
  { text: "If you don't sacrifice for what you want, what you want becomes the sacrifice.", by: "Anonymous" },
  { text: "The cost of inaction is far greater than the cost of making a mistake.", by: "Meister Eckhart" },

  // Fear, courage, change
  { text: "Do one thing every day that scares you.", by: "Eleanor Roosevelt" },
  { text: "I must not fear. Fear is the mind-killer.", by: "Frank Herbert" },
  { text: "Courage doesn't always roar. Sometimes courage is the little voice at the end of the day saying 'I will try again tomorrow.'", by: "Mary Anne Radmacher" },
  { text: "Courage is the most important of all the virtues, because without courage you can't practice any other virtue consistently.", by: "Maya Angelou" },
  { text: "We delight in the beauty of the butterfly, but rarely admit the changes it has gone through to achieve that beauty.", by: "Maya Angelou" },
  { text: "What if you fly?", by: "Erin Hanson" },
  { text: "The only way of discovering the limits of the possible is to venture a little way past them into the impossible.", by: "Arthur C. Clarke" },
  { text: "Lack of direction, not lack of time, is the problem. We all have twenty-four hour days.", by: "Zig Ziglar" },
  { text: "You don't have to see the whole staircase. Just take the first step.", by: "Martin Luther King Jr." },
  { text: "Let no man pull you so low as to hate him.", by: "Martin Luther King Jr." },
  { text: "Whenever you find yourself on the side of the majority, it is time to reform.", by: "Mark Twain" },
  { text: "If everybody is thinking alike, then somebody isn't thinking.", by: "George S. Patton" },
  { text: "What you do makes a difference, and you have to decide what kind of difference you want to make.", by: "Jane Goodall" },
  { text: "Be the reason you'd want to come home to yourself.", by: "Anonymous" },
  { text: "Learn the rules like a pro, so you can break them like an artist.", by: "Pablo Picasso" },
  { text: "I dream my painting and I paint my dream.", by: "Vincent van Gogh" },
  { text: "It is good to love many things, for therein lies the true strength.", by: "Vincent van Gogh" },

  // Time, presence, gratitude
  { text: "In three words I can sum up everything I've learned about life: it goes on.", by: "Robert Frost" },
  { text: "You only live once, but if you do it right, once is enough.", by: "Mae West" },
  { text: "I may not have gone where I intended to go, but I think I have ended up where I needed to be.", by: "Douglas Adams" },
  { text: "May you live every day of your life.", by: "Jonathan Swift" },
  { text: "Sometimes you will never know the value of a moment until it becomes a memory.", by: "Dr. Seuss" },
  { text: "Today you are You, that is truer than true. There is no one alive who is Youer than You.", by: "Dr. Seuss" },
  { text: "Good friends, good books, and a sleepy conscience: this is the ideal life.", by: "Mark Twain" },
  { text: "Count your age by friends, not years. Count your life by smiles, not tears.", by: "John Lennon" },
  { text: "Sometimes people are beautiful. Not in looks. Not in what they say. Just in what they are.", by: "Markus Zusak" },
  { text: "Better to get hurt by the truth than comforted with a lie.", by: "Khaled Hosseini" },
  { text: "It is better to be hated for what you are than to be loved for what you are not.", by: "André Gide" },
  { text: "Things change. And friends leave. Life doesn't stop for anybody.", by: "Stephen Chbosky" },
  { text: "We are what we pretend to be, so we must be careful about what we pretend to be.", by: "Kurt Vonnegut" },
  { text: "What's essential is invisible to the eye.", by: "Antoine de Saint-Exupéry" },
  { text: "It is only with the heart that one can see rightly.", by: "Antoine de Saint-Exupéry" },
  { text: "Hold fast to dreams.", by: "Langston Hughes" },
  { text: "There are years that ask questions and years that answer.", by: "Zora Neale Hurston" },
  { text: "Look what happens with a love like that — it lights the whole sky.", by: "Hafez" },
  { text: "Comparison is the thief of joy.", by: "Theodore Roosevelt" },

  // Motivation (Bennett, capped to the ones that actually land)
  { text: "Believe in yourself. You are braver than you think, more talented than you know, and capable of more than you imagine.", by: "Roy T. Bennett" },
  { text: "Don't be pushed around by the fears in your mind. Be led by the dreams in your heart.", by: "Roy T. Bennett" },
  { text: "It's only after you've stepped outside your comfort zone that you begin to change, grow, and transform.", by: "Roy T. Bennett" },
  { text: "Do not fear failure but rather fear not trying.", by: "Roy T. Bennett" },
  { text: "Do what is right, not what is easy nor what is popular.", by: "Roy T. Bennett" },
  { text: "Pursue what catches your heart, not what catches your eyes.", by: "Roy T. Bennett" },
  { text: "Start each day with a positive thought and a grateful heart.", by: "Roy T. Bennett" },
  { text: "Believe in your infinite potential. Your only limitations are those you set upon yourself.", by: "Roy T. Bennett" },

  // Letting go / honesty
  { text: "Cry. Forgive. Learn. Move on. Let your tears water the seeds of your future happiness.", by: "Steve Maraboli" },
  { text: "Letting go means to come to the realization that some people are a part of your history, but not a part of your destiny.", by: "Steve Maraboli" },
  { text: "Happiness is not the absence of problems, it's the ability to deal with them.", by: "Steve Maraboli" },
  { text: "Incredible change happens in your life when you decide to take control of what you do have power over instead of craving control over what you don't.", by: "Steve Maraboli" },
  { text: "Understanding is the first step to acceptance, and only with acceptance can there be recovery.", by: "J.K. Rowling" },
  { text: "It does not do to dwell on dreams and forget to live.", by: "J.K. Rowling" },
  { text: "You need to learn how to select your thoughts just the same way you select your clothes every day.", by: "Elizabeth Gilbert" },
  { text: "The only thing standing between you and your goal is the story you keep telling yourself.", by: "Jordan Belfort" },
  { text: "If you treat an individual as he is, he will remain how he is. But if you treat him as if he were what he ought to be, he will become what he ought to be.", by: "Goethe" },
  { text: "Two most important days in your life: the day you are born and the day you find out why.", by: "Mark Twain" },
];

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export function quoteForToday(now: Date = new Date()) {
  // Combine year + dayOfYear so the rotation isn't identical year-over-year.
  const seed = (now.getFullYear() * 367 + dayOfYear(now)) % QUOTES.length;
  return QUOTES[seed];
}

export const QUOTE_COUNT = QUOTES.length;
