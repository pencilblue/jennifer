$(document).ready(function() {
	$(document).scroll(function() {
		if($(window).width() < 768) {
			$('.hero').css({
				'top': '0'
			});
		}
		else {
			$('.hero').css({
				'top': Math.floor($(document).scrollTop() * -0.5) + 'px'
			});

			if($(document).scrollTop() > 300) {
				$('.navbar').css({
					'top': ($(document).scrollTop() * -1 + 300) + 'px'
				})
			}
			else {
				$('.navbar').css({
					'top': '0'
				})
			}
		}
	});
});
