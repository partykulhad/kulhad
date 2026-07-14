function isWithinOperatingHours(startTime, endTime) {
  if (!startTime || !endTime) return true;

  const now = new Date();
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  if (isNaN(startHour) || isNaN(endHour)) return true;

  const startDate = new Date();
  startDate.setHours(startHour, startMinute, 0, 0);

  const endDate = new Date();
  endDate.setHours(endHour, endMinute, 0, 0);

  if (endDate < startDate) {
    if (now >= startDate) return true;
    if (now <= endDate) return true;
    return false;
  }

  return now >= startDate && now <= endDate;
}
console.log(isWithinOperatingHours("12:00", "13:00"));
console.log(isWithinOperatingHours("09:00", "22:00"));
