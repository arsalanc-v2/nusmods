define([
  'underscore',
  'backbone.marionette',
  'hbs!../templates/lesson',
  'hbs!../templates/tooltip',
  'jquery-ui/draggable',
  'jquery-ui/droppable',
  'jquery-ui-touch-punch-improved'
], function(_, Marionette, template, tooltipTemplate) {
  'use strict';

  var LessonView = Marionette.ItemView.extend({
    className: 'lesson',
    template: template,
    tooltipTemplate: tooltipTemplate,

    modelEvents: {
      'change:display': function (model, display) {
        if (display) {
          this.attach();
        } else {
          this.remove();
        }
      }
    },

    initialize: function(options) {
      this.options = options;

      _.bindAll(this, 'drop', 'out', 'over', 'revert', 'start');
      this.$el.data('lessonView', this);
    },

    onRender: function() {
      this.$el.addClass('color' + this.model.get('color'));
      if (this.model.get('isDraggable')) {
        this.$el.addClass('ui-draggable');
      }
      this.$el.qtip({
        content: this.tooltipTemplate(this.model.toJSON()),
        position: {
          my: 'left center',
          at: 'right center'
        },
        show: {
          effect: function() {
            $(this).fadeTo(200, 0.85);
          }
        }
      });
      if (this.options.droppables) {
        this.$el.droppable({
          activeClass: 'active',
          addClasses: false,
          hoverClass: 'hover',
          drop: this.drop,
          over: this.over,
          out: this.out
        });
      } else if (this.model.get('isDraggable')) {
        this.$el.draggable({
          addClasses: false,
          appendTo: '#timetable-wrapper',
          cursor: 'move',
          helper: function() {
            return $(this).clone()
              .width($(this).outerWidth())
              .height($(this).outerHeight());
          },
          opacity: 0.4,
          revert: this.revert,
          start: this.start,
          zIndex: 3
        });
      }
      if (this.model.get('display')) {
        this.attach();
      }
      return this;
    },

    attach: function() {
      if (this.model.get('DayText') === 'Saturday') {
        this.options.parentView.$('#sat').show();
      }
      var rows = this.options.parentView.$('#' + this.model.get('dayAbbrev') + ' > tr');
      for (var i = 0; i <= rows.length; i++) {
        var row = rows[i];
        if (i === rows.length) {
          row = this.options.parentView.$('#mon > tr:last-child').clone()
            .appendTo(this.options.parentView.$('#' + this.model.get('dayAbbrev')));
          $(rows[0]).children().first().attr('rowspan', i + 1);
        }
        var td = $(row).children('.h' +
          this.model.get('StartTime').slice(0, 2) + '.m' +
          this.model.get('StartTime').slice(2) + ':empty');
        if (td) {
          this.detached = td.nextUntil('.h' +
            this.model.get('EndTime').slice(0, 2) + '.m' +
            this.model.get('EndTime').slice(2), 'td:empty');
          if (this.detached.length === this.model.get('duration') - 1) {
            td.attr('colspan', this.model.get('duration')).html(this.$el);
            this.detached.detach();
            break;
          }
        }
      }
    },

    out: function() {
      this.$el.qtip('hide');
      var group = this.model.get('ClassNo');
      _.each(this.options.droppables, function(lessonView) {
        if (lessonView.model.get('ClassNo') === group) {
          lessonView.$el.removeClass('hover');
        }
      });
    },

    over: function() {
      this.$el.qtip('show');
      var group = this.model.get('ClassNo');
      _.each(this.options.droppables, function(lessonView) {
        if (lessonView.model.get('ClassNo') === group) {
          lessonView.$el.addClass('hover');
        }
      });
    },

    drop: function() {
      _.each(this.options.droppables, function(lessonView) {
        lessonView.remove();
      });
      this.options.timetable.remove(this.options.timetable.where({
        ModuleCode: this.model.get('ModuleCode'),
        LessonType: this.model.get('LessonType')
      }));
      this.model.get('sameGroup').each(function(lesson) {
        this.options.timetable.add(lesson);
      }, this);
      this.options.timetable.trigger('change');
    },

    revert: function(droppable) {
      $('body').css('cursor', 'auto');
      if (droppable) {
        return false;
      } else {
        _.each(this.options.droppables, function(lessonView) {
          lessonView.remove();
        });
        return true;
      }
    },

    start: function() {
      var group = this.model.get('ClassNo');
      this.options.droppables = [];
      this.model.get('sameType').each(function(lesson) {
        if (lesson.get('ClassNo') !== group) {
          this.options.droppables.push((new LessonView({
            model: lesson,
            droppables: this.options.droppables,
            parentView: this.options.parentView,
            timetable: this.options.timetable
          })).render());
        }
      }, this);
    },

    remove: function(detach) {
      var tr = this.$el.parent()
        .removeAttr('colspan')
        .after(this.detached)
        .parent();
      if (detach) {
        this.$el.detach();
      } else {
        this.$el.remove();
        tr.nextAll().find('.lesson').each(function() {
          $(this).data('lessonView').remove(true).attach();
        });
      }
      if (!tr.find('.lesson').length && tr.index() > 1) {
        tr.remove();
      }
      return this;
    }
  });

  return LessonView;
});