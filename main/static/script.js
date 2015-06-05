$(document).ready( function() {
	
	/***********
	 * Setup
	 */
	
	var $quickpicks = 0;
	var default_live_filter = "*";
	var default_tag_filter = ".tag-kbmod";
	var default_sort = "random";
	var num_streams = 0; //ugh, couldn't quite get rid of this
	
	/************************
	 * Index page handlers
	 */
	if($('#buildlayoutform').length) add_index_event_handlers($('#buildlayoutform'));
	
	
	/************************
	 * View Page Handlers
	 */
	if($('#layoutwrapper').length) {
		
		$('button.reload').click( function() {
			$(this).parents('.chatcontainer').find('iframe').attr( 'src', function ( i, val ) { return val; });
		});
		$('.chatmenuopener').click( function() {
			$(this).siblings('.chatmenu').slideToggle(150);
		});
		
		$('.edit.sidebar-button').click( function(e) {
			e.preventDefault();
			
			if($('#popupform').length) {
				$('#layoutwrapper').removeClass('dimmed');
				$(this).removeClass('selected');
				$('#popupform').fadeOut(function(){$(this).remove();});
				$('#popupoverlay').fadeOut(function(){$(this).remove();});
			} else {
				$('#layoutwrapper').addClass('dimmed');
				$(this).addClass('selected');
				
				$("<div id=popupoverlay style='display:none'>").insertAfter($(this)).click(function(){$('#sidebar .edit.sidebar-button').click();}).fadeIn();
				$("<div id=popupform style='display:none'>").load($(this).attr('href') + ' #buildlayoutform', function() {
					$quickpicks = 0; //force isotope re-init
					add_index_event_handlers($(this));
					$(this).fadeIn();
				}).insertAfter($(this));
			}
		});

		if($('.streamcontainer[data-index="0"]').length) {
			setTimeout(function(){
				choose_stream_audio(-1);
			},3000);
		}

		$('.layoutselector[data-index]').click(function(e) {
			sync_layout($(this).attr('data-index'));
		});
		
		$('.audiobutton[data-tag]').click(function(e) {
			e.preventDefault();
			choose_stream_audio($(this).attr('data-tag'));
		});
		$('.chatbutton[data-tag],[class*=chatselector][data-tag]').click(function(e) {
			e.preventDefault();
			choose_stream_chat($(this).attr('data-tag'));
		});
		$('.bothbutton[data-tag]').click(function(e) {
			e.preventDefault();
			choose_stream_both($(this).attr('data-tag'));
		});
		$('.closebutton[data-tag]').click(function(e) {
			e.preventDefault();
			close_stream_and_chat($(this).attr('data-tag')); 
		});
		$('.reloadstream[data-tag]').click(function(e) {
			e.preventDefault();
			reload_stream($(this).attr('data-tag')); 
		});

		//Pick a valid layout
		var url_layout = document.location.href.match(/layout=?([0-9][0-9]?)/i);
		if(url_layout) url_layout = parseInt(url_layout[1], 10);
		if(-1 == $.inArray(url_layout, get_valid_layout_indexes()) ) sync_layout(-1);
	}
	
	
	/************
	 * Functions
	 */
	 
	function add_index_event_handlers($element) {
	
		$element.find('button[type="submit"]').click(function(e) {
			if($('#sidebar').length) {
				e.preventDefault();
				$('#sidebar .edit.sidebar-button').click();
			}
		});
	
		$element.find('.streamfield').streamfield().keyup(function() {
			sync_layout(-1);
			update_selected_channels();
		});
			
		setTimeout(function(){$element.find('.streamfield').filter(function(){return this.value==""}).first().focus();},100);


		$element.find('.layoutselector[data-index]').click( function() { 
			sync_layout( $(this).attr('data-index') ); 
		});
		
		
		$element.find('.channel').click(function(){
			$(this).toggleClass('selected');
			if($(this).hasClass('selected')){
				if($('.streamfield').filter(function(){return this.value==""}).length == 0) {
					window.alert("Max number of streams already selected!");
					$(this).removeClass('selected');
				} else {
					add_to_form_streams($(this).attr('rel'));
				}
			} else {
				remove_from_form_streams($(this).attr('rel'));
			}
			sync_layout(-1);
		});


		$element.find('.tabs').bind('tabsactivate', function(event, ui) {
			switch (ui.newTab.index()){
			case 1: 
				setup_isotope();
			break;
			}
		});

		
		$element.find('#clearbutton').click(function(e){
			e.preventDefault();
			$('.streamfield').each(function(){$.fn.streamfield.clear($(this).attr('id'))});
			sync_layout(-1);
			update_selected_channels();
		});	

		$element.find('#quickpicks button').click(function(e){
			e.preventDefault();
			$(this).addClass('selected').siblings().removeClass('selected');
			update_filters();
		});
		

		$element.find('.tabs').tabs();
		sync_layout(-1);
		
		if(window.location.hash.substring(0,9) == "#featured")
			setTimeout(function(){$('#featured-tab-selector a').click();}, 100);

	}

	function setup_isotope() {
		if($quickpicks==0) {
			$quickpicks = $('#channellist').isotope({
				transitionDuration: '0.5s',
				itemSelector: '.channel',
				getSortData: {
					name: '.channelname',
					live: function( itemElem ) {
						return $(itemElem).hasClass('live');
					}
				},
				sortBy: default_sort,
				sortAscending: {
					name: true,
					live: false,
				},
				layoutMode: 'masonry',
				masonry: {
					columnWidth: '.grid-sizer',
				}
			});

			$quickpicks.isotope('on','layoutComplete', function( isoInstance, laidOutItems ){
				setTimeout(function(){ //wait for animations to finish
					$('.channel').each(function() {
						$(this).removeClass('selected');
						remove_from_form_streams($(this).attr('rel'));
					});
					$('.channel.live:visible').each(function() {
						$(this).addClass('selected');
						add_to_form_streams($(this).attr('rel'));
					});
					update_selected_channels();
					sync_layout(-1);
				},500);
			});

			var tag_filter = document.location.href.match(/\#featured\/([a-zA-Z0-9\-\_]+)/i);
			if(tag_filter) {
				if(tag_filter[1] == 'all') {
					tag_filter = "*";
				} else {
					tag_filter = '.tag-' + tag_filter[1];
				}

				if($(tag_filter).length == 0)
					tag_filter = default_tag_filter;

			} else {
				tag_filter = default_tag_filter;
			}

			$('#tag-filters button[data-filter-value="'+ tag_filter +'"]').addClass('selected');
			$('#live-filters button[data-filter-value="'+ default_live_filter +'"]').addClass('selected');
			$('#sort-filters button[data-sort-value="'+ default_sort +'"]').addClass('selected');
			update_selected_channels();
			sync_layout(-1);
			update_filters();
		}
	}

	function update_filters() {
		var live_filter = $('#live-filters button.selected').attr('data-filter-value');
		if(!live_filter) live_filter = "*";
		var tag_filter = $('#tag-filters button.selected').attr('data-filter-value');
		var sort_filter = $('#sort-filters button.selected').attr('data-sort-value');
		if(!sort_filter) sort_filter = ['live','random'];
		if(tag_filter == "*")
			var cfilter = live_filter;
		else 
			var cfilter = live_filter + tag_filter;
		
		$quickpicks.isotope({ filter: cfilter, sortBy: sort_filter });
	}
		

	function reindex_objects() {
		var object_classes = ['streamcontainer', 'streamoverlay', 'chatcontainer'];
		
		for(class_i in object_classes) {
			$objects = $('.' + object_classes[class_i]);
			$objects.each(function() {
				$(this).attr('data-index', $objects.index($(this)));
			});
		}
	}


	function add_to_form_streams(streamname) {
		if($('.streamfield').filter(function(){return this.value==streamname}).length == 0) {
			$first_empty = $('.streamfield').filter(function(){return this.value==""}).first();
			$first_empty.val(streamname);
			return true;
		} else {
			return false;
		}
	}

	function remove_from_form_streams(streamname) {
		$already_selected = $('.streamfield').filter(function(){return this.value==streamname});
		$already_selected.val("")
		$.fn.streamfield.clear($already_selected.attr('id'));
	}

	function update_selected_channels() {
		$('.channel.selected').each(function(){
			channelname = $(this).attr('rel');
			if($('.streamfield').filter(function(){return this.value==channelname}).length == 0)
				$(this).removeClass('selected');
		});
		$('.streamfield').each(function(){
			$('.channel[rel="' + $(this).val() + '"]').addClass('selected');
		});
	}


	function choose_stream_both(tag) {
		choose_stream_chat(tag);
		choose_stream_audio(tag);
	}

	function choose_stream_audio(tag) {
		if(tag == -1) { // -1 = force auto-selection of first available stream
			tag = $('.streamcontainer[data-index="0"]').attr('data-tag');
		}
		
		var $new_str = $('.streamcontainer[data-tag="' + tag + '"]');
		var $other_str = $new_str.siblings('.streamcontainer');
		var $new_ovr = $('.streamoverlay[data-tag="' + tag + '"]');
		var $other_ovr = $new_ovr.siblings('.streamoverlay');
		
		$other_str.removeClass('audio');
		$new_str.addClass('audio');
		$other_ovr.removeClass('audio');
		$new_ovr.addClass('audio');

		$other_str.find('object,embed').each(function(){
			try { $(this)[0].mute(); }
			catch(e) {}
		});
		$new_str.find('object,embed').each(function(){
			try { $(this)[0].unmute(); }
			catch(e) {}
		});
	}

	function choose_stream_chat(tag) {
		if(tag == -1) { // -1 = force auto-selection of first available stream
			tag = $('.streamcontainer[data-index="0"]').attr('data-tag');
		}
		
		$('.chatcontainer[data-tag="' + tag + '"]').addClass('current');
		$('.chatcontainer:not([data-tag="' + tag + '"])').removeClass('current');
		
		$('.streamcontainer[data-tag="' + tag + '"]').addClass('chat');
		$('.streamcontainer:not([data-tag="' + tag + '"])').removeClass('chat');
		
		$('.streamoverlay[data-tag="' + tag + '"]').addClass('chat');
		$('.streamoverlay:not([data-tag="' + tag + '"])').removeClass('chat');
		
		$('.chatmenu').hide();
	}

	function sync_layout(index) {
		
		old_num_streams = num_streams;
		num_streams = get_num_streams();
		console.debug(num_streams);
		
		if(index != -1 || num_streams != old_num_streams) {
		
			//index == -1 means auto-select a valid layout
			if (index == -1) {
				index = get_first_valid_layout_index(num_streams);
			}
			
			//Select the correct sidebar and form button and unselect the others
			$('.layoutselector[data-index="' + index + '"]').addClass('current');
			$('.layoutselector:not([data-index="' + index + '"])').removeClass('current');
			$('input[name=layout][data-index="' + index + '"]').attr('checked','checked');
			$('input[name=layout]:not([data-index="' + index + '"])').removeAttr('checked');
			
			//Change the layout wrapper's class
			$('#layoutwrapper').attr('data-layout-index', index);

			//Change the visible layoutgroup
			$('.layoutselectors .layoutgroup[data-streams="' + num_streams + '"]').addClass('current');
			$('.layoutselectors .layoutgroup:not([data-streams="' + num_streams + '"])').removeClass('current');
			
			if($('#layoutwrapper').length) {
				//Change the URL
				old_url = getLocation().pathname;
				
				if(old_url.indexOf('layout') !== -1) {
					if(index === undefined) {
						new_url = old_url.replace(/\/layout=?[0-9][0-9]?/i, '');
					} else {
						new_url = old_url.replace(/\/layout=?[0-9][0-9]?/i, '/layout' + index);
					}
				} else {
					if(index === undefined) {
						new_url = old_url;
					} else {
						new_url = old_url + "layout" + index + "/";
					}
				}
				
				history.replaceState({}, "Layout " + index, new_url);
			}
			
		}
		
		if($('#buildlayoutform').length) {
						
			//Hide / show form fields based on how many streams there are
			$('.streamfieldcontainer').each( function() {
				if ( $(this).index() < num_streams + 1 ) 
					$(this).slideDown();
				else
					$(this).slideUp();
			});
			
			//Hide submit button if there are no streams
			if(num_streams == 0)
				$('#submitbuttoncontainer').slideUp();
			else
				$('#submitbuttoncontainer').slideDown();
			
		}
		
	}

	function getLocation() {
		var l = document.createElement("a");
		l.href = window.location.href;
		return l;
	};


	function close_stream_and_chat(tag) {
		var reset_chat = (tag == get_current_chat());
		var reset_audio = (tag == get_current_audio());
		
		$('[data-object-type="stream"][data-tag="' + tag + '"]').remove();
		$('[data-object-type="chat"][data-tag="' + tag + '"]').remove();
		reindex_objects();

		new_url = getLocation().pathname.replace(new RegExp("\/" + tag, "i"), '');
		history.replaceState({}, "", new_url);
		
		new_edit_url = $('a.edit.sidebar-button').attr('href').replace(new RegExp("\/" + tag, "i"), '');
		$('a.edit.sidebar-button').attr('href', new_edit_url);
		
		sync_layout(-1); //auto-select
		
		if (reset_chat) choose_stream_chat(-1);
		if (reset_audio) choose_stream_audio(-1);
	}
	
	function get_num_streams() {
		if($('.streamfield').length) {
			return $('.streamfield[value!=""]').length;
		} else {
			return $('.streamcontainer').length;
		}
	}

	function get_first_valid_layout_index(num_streams=null,chat=null) {
		return get_valid_layout_indexes(num_streams,chat)[0];
	}

	function get_valid_layout_indexes(num_streams=null,chat=null) {
		if(num_streams === null)
			num_streams = get_num_streams();
		
		if(num_streams === 0)
			return 0;
		else
			return Object.keys(layout_groups[num_streams]);
	}

	function get_current_chat() {
		return $('.streamcontainer.chat').first().attr('data-tag');
	}

	function get_current_audio() {
		return $('.streamcontainer.audio').first().attr('data-tag');
	}
	
	function get_current_layout() {
		return $('.layoutselectors .layoutselector.current').first().attr('data-index');
	}
});
