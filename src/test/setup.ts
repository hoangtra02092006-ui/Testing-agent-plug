// Run tests in a non-UTC time zone so local-day logic (streaks, daily limits) is really exercised.
process.env.TZ = 'Asia/Ho_Chi_Minh';
