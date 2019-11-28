import React from 'react';
import { TemplateFragment } from 'app/graphql/types';
import { sandboxUrl } from '@codesandbox/common/lib/utils/url-generator';
import { useOvermind } from 'app/overmind';
import { useKey } from 'react-use';
import { isMac } from '@codesandbox/common/lib/utils/platform';
import { getSandboxName } from '@codesandbox/common/lib/utils/get-sandbox-name';
import history from 'app/utils/history';
import MdEditIcon from 'react-icons/lib/md/edit';

import { SandboxCard } from '../SandboxCard';
import { SubHeader, Grid } from '../elements';
import { EditIcon } from './elements';

export interface ITemplateInfo {
  title?: string;
  key: string;
  templates: TemplateFragment[];
}

export interface ITemplateListProps {
  templateInfos: ITemplateInfo[];
  forkOnOpen?: boolean;
  columnCount?: number;
}

const MODIFIER_KEY = isMac ? 'Ctrl' : '⇧';

const getNumber = (e: KeyboardEvent): number => {
  if (e.code && e.code.startsWith('Digit')) {
    return parseInt(e.code.replace('Digit', ''), 10);
  }

  return NaN;
};

export const TemplateList = ({
  templateInfos,
  forkOnOpen,
  columnCount = 2,
}: ITemplateListProps) => {
  const { actions } = useOvermind();
  const [focusedTemplateIndex, setFocusedTemplate] = React.useState(0);

  const openSandbox = (
    sandbox: TemplateFragment['sandbox'],
    openInNewWindow = false
  ) => {
    if (forkOnOpen) {
      actions.editor.forkExternalSandbox({
        sandboxId: sandbox.id,
        openInNewWindow,
      });
    } else {
      history.push(sandboxUrl(sandbox));
    }

    return actions.modalClosed();
  };

  const getTemplateInfoByIndex = React.useCallback(
    (index: number) => {
      let count = 0;
      let i = 0;
      while (index >= count && i < templateInfos.length) {
        count += templateInfos[i].templates.length;
        i++;
      }
      return {
        templateInfo: templateInfos[i - 1],
        offset: count - templateInfos[i - 1].templates.length,
      };
    },
    [templateInfos]
  );

  const getTemplateByIndex = (index: number) => {
    const { templateInfo, offset } = getTemplateInfoByIndex(index);

    const indexInTemplateInfo = index - offset;
    return templateInfo.templates[indexInTemplateInfo];
  };

  const getColumnCountInLastRow = (templateInfo: ITemplateInfo) =>
    templateInfo.templates.length % columnCount || columnCount;

  const getTotalTemplateCount = React.useCallback(
    () =>
      templateInfos.reduce(
        (total, templateInfo) => total + templateInfo.templates.length,
        0
      ),
    [templateInfos]
  );

  /**
   * Ensures that the next set is in bound of 0 and the max template count
   */
  const safeSetFocusedTemplate = React.useCallback(
    (setter: (newPos: number) => number) => {
      const totalCount = getTotalTemplateCount();

      return setFocusedTemplate(i =>
        Math.max(0, Math.min(setter(i), totalCount - 1))
      );
    },
    [getTotalTemplateCount]
  );

  React.useEffect(() => {
    // Make sure our index stays in bounds with max templateInfos

    const totalCount = getTotalTemplateCount();

    if (focusedTemplateIndex >= totalCount || focusedTemplateIndex < 0) {
      safeSetFocusedTemplate(i => i);
    }

    // We only want this check to happen if templateInfos changes. Only then we
    // can get our index out of bounds
    // eslint-disable-next-line
  }, [templateInfos]);

  useKey(
    'ArrowRight',
    evt => {
      evt.preventDefault();
      safeSetFocusedTemplate(i => i + 1);
    },
    {},
    [safeSetFocusedTemplate]
  );

  useKey(
    'ArrowLeft',
    evt => {
      evt.preventDefault();
      safeSetFocusedTemplate(i => i - 1);
    },
    {},
    [safeSetFocusedTemplate]
  );

  useKey(
    'ArrowDown',
    evt => {
      evt.preventDefault();
      const { templateInfo, offset } = getTemplateInfoByIndex(
        focusedTemplateIndex
      );
      const indexInTemplateInfo = focusedTemplateIndex - offset;
      const totalRowCount = Math.ceil(
        templateInfo.templates.length / columnCount
      );
      const currentRow = Math.floor(indexInTemplateInfo / columnCount);
      const isLastRow = totalRowCount === currentRow + 1;
      const nextTemplateInfo =
        templateInfos[templateInfos.indexOf(templateInfo) + 1] || templateInfo;

      const { templateInfo: templateInfoUnder } = getTemplateInfoByIndex(
        focusedTemplateIndex + columnCount
      );
      const hasItemUnder = !isLastRow || templateInfoUnder === nextTemplateInfo;
      const itemsAfterCurrentItem =
        templateInfo.templates.length - 1 - indexInTemplateInfo;

      safeSetFocusedTemplate(
        i =>
          i +
          Math.min(
            hasItemUnder ? columnCount : itemsAfterCurrentItem + 1,
            templateInfo.templates.length
          )
      );
    },
    {},
    [focusedTemplateIndex, getTemplateInfoByIndex, safeSetFocusedTemplate]
  );

  useKey(
    'ArrowUp',
    evt => {
      evt.preventDefault();
      const { templateInfo, offset } = getTemplateInfoByIndex(
        focusedTemplateIndex
      );
      const previousTemplateInfo =
        templateInfos[templateInfos.indexOf(templateInfo) - 1] || templateInfo;
      const indexInTemplateInfo = focusedTemplateIndex - offset;
      const isFirstItem = indexInTemplateInfo === 0;
      const columnsInLastRowForPreviousTemplateInfo = getColumnCountInLastRow(
        previousTemplateInfo
      );

      safeSetFocusedTemplate(
        i =>
          i -
          Math.min(
            isFirstItem ? columnsInLastRowForPreviousTemplateInfo : columnCount,

            previousTemplateInfo.templates.length
          )
      );
    },
    {},
    [focusedTemplateIndex, getTemplateInfoByIndex, safeSetFocusedTemplate]
  );

  /**
   * Our listener for CMD/CTRL + Num calls
   */
  useKey(
    e => {
      const num = getNumber(e);
      const modifierCheck = isMac ? e.ctrlKey : e.shiftKey;
      return num > 0 && num < 10 && modifierCheck;
    },
    e => {
      const num = getNumber(e);

      const template = getTemplateByIndex(num - 1);
      openSandbox(template.sandbox);
    }
  );

  let offset = 0;
  return (
    <>
      {templateInfos.map(({ templates, title, key }, templateInfoIndex) => {
        if (templateInfoIndex > 0) {
          offset += templateInfos[templateInfoIndex - 1].templates.length;
        }

        if (templates.length === 0) {
          return null;
        }

        return (
          <div key={key} style={{ marginBottom: '2rem' }}>
            {title !== undefined && <SubHeader>{title}</SubHeader>}
            <Grid columnCount={columnCount}>
              {templates.map((template: TemplateFragment, i) => {
                const index = offset + i;
                const focused = focusedTemplateIndex === offset + i;

                const shortKey =
                  index < 9 ? `${MODIFIER_KEY}+${index + 1}` : '';
                const detailText = focused ? '↵' : shortKey;

                return (
                  <SandboxCard
                    key={template.id}
                    title={getSandboxName(template.sandbox)}
                    iconUrl={template.iconUrl}
                    // @ts-ignore
                    environment={template.sandbox.source.template}
                    color={template.color}
                    onFocus={() => {
                      safeSetFocusedTemplate(() => index);
                    }}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        openSandbox(template.sandbox, e.metaKey || e.ctrlKey);
                      }
                    }}
                    onClick={e => {
                      e.preventDefault();
                      openSandbox(template.sandbox, e.metaKey || e.ctrlKey);
                    }}
                    focused={focused}
                    detailText={detailText}
                    DetailedComponent={
                      forkOnOpen
                        ? () => (
                            <EditIcon
                              onClick={evt => {
                                evt.stopPropagation();
                                actions.modalClosed();
                              }}
                              to={sandboxUrl(template.sandbox)}
                            >
                              <MdEditIcon />
                            </EditIcon>
                          )
                        : undefined
                    }
                  />
                );
              })}
            </Grid>
          </div>
        );
      })}
    </>
  );
};
