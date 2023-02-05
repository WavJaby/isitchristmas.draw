function drawCircle(x, y, r, rotation, amount, step) {
	if (!rotation) rotation = 0;
	if (!amount) amount = 360;
	if (!step) step = 20;
	const count = amount / step;
	
	for (let i = 0; i < count; i++) {
		const fregment = getFregment();
		const fregmentFlagWidth = flagWidth(fregment.me.country);
		
		const j = 2 * Math.PI * ((i * step + rotation) / 360);
		const newX = x + r * Math.cos(j);
		const newY = y + r * Math.sin(j);
		const angle = i * step + 90 + rotation;
		fregment.setRotation(angle);
		fregment.placeFlag(newX, newY);
	}
}


function drawLine(x1, y1, x2, y2, step) {
	const vx = x2 - x1, vy = y2 - y1;
	const length = Math.sqrt(vx * vx + vy * vy);
	const count = length / step;
	const angle = Math.atan2(vy, vx) * (180 / Math.PI);
	
	for (let i = 0; i < count; i++) {
		const fregment = getFregment();
		const fregmentFlagWidth = flagWidth(fregment.me.country);
		
		const j = i / count;
		const newX = x1 + vx * j;
		const newY = y1 + vy * j;
		fregment.setRotation(angle);
		fregment.placeFlag(newX, newY);
	}
}