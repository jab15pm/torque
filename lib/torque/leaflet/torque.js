/**
 * torque layer
 */
L.TorqueLayer = L.CanvasLayer.extend({

  providers: {
    'sql_api': torque.providers.json,
    'url_template': torque.providers.jsonarray
  },

  renderers: {
    'point': torque.renderer.Point,
    'pixel': torque.renderer.Rectangle
  },

  initialize: function(options) {
    var self = this;
    options.tileLoader = true;
    this.key = 0;

    L.CanvasLayer.prototype.initialize.call(this, options);

    this.options.renderer = this.options.renderer || 'point';

    this.provider = new this.providers[this.options.provider](options);
    this.renderer = new this.renderers[this.options.renderer](this.getCanvas(), options);

    // for each tile shown on the map request the data
    this.on('tileAdded', function(t) {
      var tileData = this.provider.getTileData(t, t.zoom, function(tileData) {
        self._tileLoaded(t, tileData);
        self.redraw();
      });
    }, this);
  },

  /**
   * render the selectef key
   * don't call this function directly, it's called by
   * requestAnimationFrame. Use redraw to refresh it
   */
  render: function() {
    var t, tile, pos;
    var canvas = this.getCanvas();
    canvas.width = canvas.width;
    var ctx = canvas.getContext('2d');

    if(typeof this.key === 'number') {
      // renders only a "frame"
      for(t in this._tiles) {
        tile = this._tiles[t];
        pos = this.getTilePos(tile.coord);
        ctx.setTransform(1, 0, 0, 1, pos.x, pos.y);
        this.renderer.renderTile(tile, this.key, pos.x, pos.y);
      }
    } else {
      // accumulate more than one
      for(t in this._tiles) {
        tile = this._tiles[t];
        pos = this.getTilePos(tile.coord);
        var accum = this.renderer.accumulate(tile, this.key);
        ctx.setTransform(1, 0, 0, 1, pos.x, pos.y);
        this.renderer.renderTileAccum(accum, 0, 0);
      }
    }

  },

  /**
   * set key to be shown. If it's a single value
   * it renders directly, if it's an array it renders
   * accumulated
   */
  setKey: function(key) {
    this.key = key;
    this.redraw();
  }

});


L.TiledTorqueLayer = L.TileLayer.Canvas.extend({

  providers: {
    'sql_api': torque.providers.json,
    'url_template': torque.providers.JsonArray
  },

  renderers: {
    'point': torque.renderer.Point,
    'pixel': torque.renderer.Rectangle
  },

  initialize: function(options) {
    var self = this;
    this.key = 0;

    options.async = true;
    L.TileLayer.Canvas.prototype.initialize.call(this, options);


    this.options.renderer = this.options.renderer || 'pixel';

    this.provider = new this.providers[this.options.provider](options);
    this.renderer = new this.renderers[this.options.renderer](null, options);

  },

  _tileLoaded: function(tile, tilePoint, tileData) {
    if(this._tiles[tilePoint.x + ':' + tilePoint.y] !== undefined) {
      this._tiles[tilePoint.x + ':' + tilePoint.y].data = tileData;
      this.drawTile(tile);
    }
  },

  _loadTile: function(tile, tilePoint) {
    var self = this;
    L.TileLayer.Canvas.prototype._loadTile.apply(this, arguments);
    this.provider.getTileData(tilePoint, this._map.getZoom(), function(tileData) {
      self._tileLoaded(tile, tilePoint, tileData);
      L.DomUtil.addClass(tile, 'leaflet-tile-loaded');
    });
  },

  drawTile: function (tile) {
    var canvas = tile;
    if(!tile.data) return;
    canvas.width = canvas.width;

    this.renderer.setCanvas(canvas);

    var accum = this.renderer.accumulate(tile.data, this.key);
    this.renderer.renderTileAccum(accum, 0, 0);
  },

  setKey: function(key) {
    this.key = key;
    this.redraw();
  }

});
