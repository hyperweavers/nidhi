import { ChartType } from '../models/chart';
import { ChartUtils } from './chart.utils';

describe('ChartUtils', () => {
  describe('color constants', () => {
    it('should have defined static color constants', () => {
      expect(ChartUtils.colorBlue).toBe('#0066CC');
      expect(ChartUtils.colorGreen).toBe('#63993D');
      expect(ChartUtils.colorYellow).toBe('#FACA15');
      expect(ChartUtils.colorPurple).toBe('#876FD4');
      expect(ChartUtils.colorGray).toBe('#9CA3AF');
      expect(ChartUtils.defaultColor).toBe('#707070');
    });
  });

  describe('default datasets', () => {
    it('should provide defaultDoughnutChartDataset', () => {
      const ds = ChartUtils.defaultDoughnutChartDataset;
      expect(ds.data).toEqual([]);
      expect(ds.borderWidth).toBe(0);
      expect(ds.hoverBorderWidth).toBe(0);
    });

    it('should provide defaultLineChartDataset', () => {
      const ds = ChartUtils.defaultLineChartDataset;
      expect(ds.data).toEqual([]);
      expect(ds.borderWidth).toBe(4);
      expect(ds.tension).toBe(0.4);
      expect(ds.pointHoverRadius).toBe(6);
      expect(ds.spanGaps).toBe(true);
      expect(ds.pointRadius).toBe(0);
      expect(ds.pointHoverBorderWidth).toBe(0);
      expect(ds.borderCapStyle).toBe('round');
    });

    it('should provide defaultBarChartDataset', () => {
      const ds = ChartUtils.defaultBarChartDataset;
      expect(ds.data).toEqual([]);
      expect(ds.barPercentage).toBe(0.5);
      expect(ds.barThickness).toBe(18);
      expect(ds.maxBarThickness).toBe(15);
      expect(ds.minBarLength).toBe(2);
    });
  });

  describe('getDoughnutChartColors', () => {
    it('should return border/hover/background colors array', () => {
      const colors = ['#FF0000', '#00FF00', '#0000FF'];
      const result = ChartUtils.getDoughnutChartColors(colors);
      expect(result).toEqual({
        borderColor: colors,
        hoverBorderColor: colors,
        backgroundColor: colors,
        hoverBackgroundColor: colors,
      });
    });
  });

  describe('getLineChartColor', () => {
    it('should return border/hover/background color string', () => {
      const color = '#FF0000';
      const result = ChartUtils.getLineChartColor(color);
      expect(result).toEqual({
        borderColor: color,
        hoverBorderColor: color,
        backgroundColor: color,
        hoverBackgroundColor: color,
      });
    });
  });

  describe('getBarChartColor', () => {
    it('should return border/hover/background color string', () => {
      const color = '#00FF00';
      const result = ChartUtils.getBarChartColor(color);
      expect(result).toEqual({
        borderColor: color,
        hoverBorderColor: color,
        backgroundColor: color,
        hoverBackgroundColor: color,
      });
    });
  });

  describe('getDoughnutChartOptions', () => {
    it('should return responsive options with cutout 70%', () => {
      const options = ChartUtils.getDoughnutChartOptions();
      expect(options.responsive).toBe(true);
      expect(options.maintainAspectRatio).toBe(false);
      expect(options.cutout).toBe('70%');
      expect(options.plugins!.legend!.position).toBe('bottom');
    });

    it('should set label callback undefined when not provided', () => {
      const options = ChartUtils.getDoughnutChartOptions();
      expect(
        (options.plugins!.tooltip as any).callbacks.label,
      ).toBeUndefined();
    });

    it('should use provided tooltipLabelCallback', () => {
      const spy = jest.fn().mockReturnValue('custom label');
      const options = ChartUtils.getDoughnutChartOptions(spy);
      expect((options.plugins!.tooltip as any).callbacks.label).toBe(spy);
    });

    describe('labelColor callback', () => {
      it('should return color from dataset backgroundColor array', () => {
        const options = ChartUtils.getDoughnutChartOptions();
        const context = {
          dataset: { backgroundColor: ['#111', '#222', '#333'] },
          dataIndex: 1,
        };
        const result = (
          options.plugins!.tooltip as any
        ).callbacks.labelColor(context);
        expect(result).toEqual({
          borderColor: '#222',
          backgroundColor: '#222',
          borderWidth: 3,
        });
      });

      it('should return defaultColor when backgroundColor is missing', () => {
        const options = ChartUtils.getDoughnutChartOptions();
        const context = { dataset: {} as any, dataIndex: 0 };
        const result = (
          options.plugins!.tooltip as any
        ).callbacks.labelColor(context);
        expect(result.borderColor).toBe(ChartUtils.defaultColor);
        expect(result.backgroundColor).toBe(ChartUtils.defaultColor);
      });
    });
  });

  describe('getLineChartOptions', () => {
    it('should return default options with caret hidden', () => {
      const options = ChartUtils.getLineChartOptions();
      expect(options.responsive).toBe(true);
      expect(options.maintainAspectRatio).toBe(false);
      expect((options as any).interaction.mode).toBe('index');
      expect((options as any).interaction.intersect).toBe(false);
      expect(options.plugins!.tooltip!.caretSize).toBe(0);
    });

    it('should show caret when showCaret is true', () => {
      const options = ChartUtils.getLineChartOptions(
        undefined,
        undefined,
        true,
      );
      expect(options.plugins!.tooltip!.caretSize).toBe(5);
    });

    it('should set scale titles when provided', () => {
      const options = ChartUtils.getLineChartOptions('X Axis', 'Y Axis');
      expect((options as any).scales.x.title.display).toBe(true);
      expect((options as any).scales.x.title.text).toBe('X Axis');
      expect((options as any).scales.y.title.display).toBe(true);
      expect((options as any).scales.y.title.text).toBe('Y Axis');
    });

    it('should hide scale titles when not provided', () => {
      const options = ChartUtils.getLineChartOptions();
      expect((options as any).scales.x.title.display).toBe(false);
      expect((options as any).scales.x.title.text).toBe('');
      expect((options as any).scales.y.title.display).toBe(false);
      expect((options as any).scales.y.title.text).toBe('');
    });

    it('should set tooltip callbacks when provided', () => {
      const labelCb = jest.fn();
      const titleCb = jest.fn();
      const footerCb = jest.fn();
      const options = ChartUtils.getLineChartOptions(
        undefined,
        undefined,
        undefined,
        labelCb,
        titleCb,
        footerCb,
      );
      expect((options.plugins!.tooltip as any).callbacks.label).toBe(labelCb);
      expect((options.plugins!.tooltip as any).callbacks.title).toBe(titleCb);
      expect((options.plugins!.tooltip as any).callbacks.footer).toBe(footerCb);
    });

    it('should leave tooltip callbacks undefined when not provided', () => {
      const options = ChartUtils.getLineChartOptions();
      expect(
        (options.plugins!.tooltip as any).callbacks.label,
      ).toBeUndefined();
      expect(
        (options.plugins!.tooltip as any).callbacks.title,
      ).toBeUndefined();
      expect(
        (options.plugins!.tooltip as any).callbacks.footer,
      ).toBeUndefined();
    });
  });

  describe('getBarChartOptions', () => {
    it('should return default options with caret hidden', () => {
      const options = ChartUtils.getBarChartOptions();
      expect(options.responsive).toBe(true);
      expect(options.maintainAspectRatio).toBe(false);
      expect((options as any).scales.x.stacked).toBeUndefined();
      expect((options as any).scales.y.stacked).toBeUndefined();
      expect(options.plugins!.tooltip!.caretSize).toBe(0);
    });

    it('should set stacked when true', () => {
      const options = ChartUtils.getBarChartOptions(
        undefined,
        undefined,
        true,
      );
      expect((options as any).scales.x.stacked).toBe(true);
      expect((options as any).scales.y.stacked).toBe(true);
    });

    it('should set stacked when false', () => {
      const options = ChartUtils.getBarChartOptions(
        undefined,
        undefined,
        false,
      );
      expect((options as any).scales.x.stacked).toBe(false);
      expect((options as any).scales.y.stacked).toBe(false);
    });

    it('should show caret when showCaret is true', () => {
      const options = ChartUtils.getBarChartOptions(
        undefined,
        undefined,
        undefined,
        true,
      );
      expect(options.plugins!.tooltip!.caretSize).toBe(5);
    });

    it('should set scale titles when provided', () => {
      const options = ChartUtils.getBarChartOptions('X', 'Y');
      expect((options as any).scales.x.title.display).toBe(true);
      expect((options as any).scales.x.title.text).toBe('X');
      expect((options as any).scales.y.title.display).toBe(true);
      expect((options as any).scales.y.title.text).toBe('Y');
    });

    it('should set tooltip callbacks when provided', () => {
      const labelCb = jest.fn();
      const titleCb = jest.fn();
      const footerCb = jest.fn();
      const options = ChartUtils.getBarChartOptions(
        undefined,
        undefined,
        undefined,
        undefined,
        labelCb,
        titleCb,
        footerCb,
      );
      expect((options.plugins!.tooltip as any).callbacks.label).toBe(labelCb);
      expect((options.plugins!.tooltip as any).callbacks.title).toBe(titleCb);
      expect((options.plugins!.tooltip as any).callbacks.footer).toBe(footerCb);
    });

    describe('labelColor callback', () => {
      it('should return color from dataset backgroundColor string', () => {
        const options = ChartUtils.getBarChartOptions();
        const context = {
          dataset: { backgroundColor: 'rgb(255, 0, 0)' },
        };
        const result = (
          options.plugins!.tooltip as any
        ).callbacks.labelColor(context);
        expect(result).toEqual({
          borderColor: 'rgb(255, 0, 0)',
          backgroundColor: 'rgb(255, 0, 0)',
          borderWidth: 3,
        });
      });

      it('should return defaultColor when backgroundColor is missing', () => {
        const options = ChartUtils.getBarChartOptions();
        const context = { dataset: {} as any };
        const result = (
          options.plugins!.tooltip as any
        ).callbacks.labelColor(context);
        expect(result.borderColor).toBe(ChartUtils.defaultColor);
        expect(result.backgroundColor).toBe(ChartUtils.defaultColor);
      });
    });
  });

  describe('verticalHoverLine plugin', () => {
    it('should have id verticalHoverLine', () => {
      expect(ChartUtils.verticalHoverLine.id).toBe('verticalHoverLine');
    });

    it('should draw dashed vertical line for active data points', () => {
      const ctx = {
        save: jest.fn(),
        beginPath: jest.fn(),
        setLineDash: jest.fn(),
        strokeStyle: '',
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
      };
      const chart = {
        ctx,
        chartArea: { top: 10, bottom: 200 },
        getDatasetMeta: jest.fn().mockReturnValue({
          data: [
            { active: true, x: 50 },
            { active: false, x: 100 },
            { active: true, x: 150 },
          ],
        }),
      };

      ChartUtils.verticalHoverLine.beforeDatasetsDraw(chart as any);

      expect(ctx.save).toHaveBeenCalledTimes(1);
      expect(ctx.beginPath).toHaveBeenCalledTimes(2);
      expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
      expect(ctx.moveTo).toHaveBeenNthCalledWith(1, 50, 10);
      expect(ctx.lineTo).toHaveBeenNthCalledWith(1, 50, 200);
      expect(ctx.moveTo).toHaveBeenNthCalledWith(2, 150, 10);
      expect(ctx.lineTo).toHaveBeenNthCalledWith(2, 150, 200);
      expect(ctx.stroke).toHaveBeenCalledTimes(2);
    });

    it('should do nothing when no data points are active', () => {
      const ctx = {
        save: jest.fn(),
        beginPath: jest.fn(),
        setLineDash: jest.fn(),
        strokeStyle: '',
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
      };
      const chart = {
        ctx,
        chartArea: { top: 10, bottom: 100 },
        getDatasetMeta: jest.fn().mockReturnValue({
          data: [
            { active: false, x: 50 },
            { active: false, x: 100 },
          ],
        }),
      };

      ChartUtils.verticalHoverLine.beforeDatasetsDraw(chart as any);

      expect(ctx.beginPath).not.toHaveBeenCalled();
      expect(ctx.moveTo).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });
  });

  describe('increaseLegendSpacing plugin', () => {
    it('should have id increaseLegendSpacing', () => {
      expect(ChartUtils.increaseLegendSpacing.id).toBe(
        'increaseLegendSpacing',
      );
    });

    it('should increase legend height by 20 when legend.fit exists', () => {
      const originalFit = jest.fn();
      const legend = { fit: originalFit, height: 10 };
      const chart = { legend };

      ChartUtils.increaseLegendSpacing.beforeInit(chart as any);
      (chart.legend as any).fit();

      expect(originalFit).toHaveBeenCalled();
      expect(chart.legend.height).toBe(30);
    });

    it('should do nothing when legend is null', () => {
      const chart = { legend: null as any };

      expect(() => {
        ChartUtils.increaseLegendSpacing.beforeInit(chart as any);
      }).not.toThrow();
    });

    it('should do nothing when legend.fit is falsy', () => {
      const legend = { fit: null, height: 10 };
      const chart = { legend };

      ChartUtils.increaseLegendSpacing.beforeInit(chart as any);

      expect(legend.fit).toBeNull();
      expect(legend.height).toBe(10);
    });
  describe('legend onClick handlers', () => {
    it('should call doughnut legend onClick without error', () => {
      const options = ChartUtils.getDoughnutChartOptions();
      const onClick = (options.plugins!.legend as any).onClick;
      expect(() => onClick()).not.toThrow();
    });

    it('should call line legend onClick without error', () => {
      const options = ChartUtils.getLineChartOptions();
      const onClick = (options.plugins!.legend as any).onClick;
      expect(() => onClick()).not.toThrow();
    });

    it('should call bar legend onClick without error', () => {
      const options = ChartUtils.getBarChartOptions();
      const onClick = (options.plugins!.legend as any).onClick;
      expect(() => onClick()).not.toThrow();
    });
  });
});
